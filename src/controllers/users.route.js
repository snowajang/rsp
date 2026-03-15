import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { ensureAuth } from '../middlewares/auth.js';

const router = Router();
const allowedRoles = new Set(['admin', 'user']);
const allowedPageSizes = new Set([10, 20, 30]);

function toInt(v, fallback) {
  const n = Number.parseInt(String(v ?? ''), 10);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function normalizePageSize(value) {
  return allowedPageSizes.has(value) ? value : 10;
}

function buildUsersQuery(page, pageSize, search = '') {
  const qs = new URLSearchParams();
  qs.set('page', String(page));
  qs.set('pageSize', String(pageSize));
  if (search) qs.set('search', search);
  return `/users?${qs.toString()}`;
}

function safeTrim(value) {
  return String(value ?? '').trim();
}

function normalizeBoolean(value) {
  return value === 'true' || value === '1' || value === 'on';
}

function parsePid(value) {
  const pid = safeTrim(value);
  if (!/^\d+$/.test(pid)) return null;
  try {
    return BigInt(pid);
  } catch {
    return null;
  }
}

function buildWhere(search) {
  const keyword = safeTrim(search);
  if (!keyword) return {};
  return {
    OR: [
      { name: { contains: keyword } },
      { email: { contains: keyword } },
      { username: { contains: keyword } }
    ]
  };
}

router.get('/', ensureAuth, async (req, res, next) => {
  try {
    const pageRaw = toInt(req.query.page, 1);
    const pageSizeRaw = toInt(req.query.pageSize, 10);
    const pageSize = normalizePageSize(pageSizeRaw);
    const search = safeTrim(req.query.search);

    if (req.session) req.session.usersPageSize = pageSize;
    const finalPageSize = req.session?.usersPageSize && allowedPageSizes.has(req.session.usersPageSize)
      ? req.session.usersPageSize
      : pageSize;

    const where = buildWhere(search);
    const totalItems = await req.prisma.user.count({ where });
    const totalPages = Math.max(1, Math.ceil(totalItems / finalPageSize));
    const page = clamp(pageRaw, 1, totalPages);
    const skip = (page - 1) * finalPageSize;

    const users = await req.prisma.user.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { pid: 'desc' }],
      skip,
      take: finalPageSize,
    });

    res.render('users', {
      title: 'User Management',
      users,
      filters: { search },
      roles: ['admin', 'user'],
      formData: { pid: '', username: '', name: '', email: '', role: 'user', isActive: true },
      flash: {
        type: req.query.status || null,
        message: req.query.message || null,
      },
      pagination: {
        page,
        pageSize: finalPageSize,
        totalItems,
        totalPages,
        hasPrev: page > 1,
        hasNext: page < totalPages,
      },
      currentQuery: { page, pageSize: finalPageSize, search },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/', ensureAuth, async (req, res, next) => {
  try {
    const pid = parsePid(req.body.pid);
    const username = safeTrim(req.body.username).toLowerCase();
    const name = safeTrim(req.body.name);
    const email = safeTrim(req.body.email).toLowerCase();
    const role = allowedRoles.has(req.body.role) ? req.body.role : 'user';
    const password = String(req.body.password ?? '');
    const isActive = normalizeBoolean(req.body.isActive);

    if (!pid) {
      return res.redirect(buildUsersQuery(1, normalizePageSize(toInt(req.body.pageSize, 10)), safeTrim(req.body.search)) + '&status=danger&message=' + encodeURIComponent('เลขประจำตัวผู้ใช้ไม่ถูกต้อง'));
    }
    if (!username || !name || !email || !password) {
      return res.redirect(buildUsersQuery(1, normalizePageSize(toInt(req.body.pageSize, 10)), safeTrim(req.body.search)) + '&status=danger&message=' + encodeURIComponent('กรุณากรอกข้อมูลให้ครบถ้วน'));
    }
    if (password.length < 6) {
      return res.redirect(buildUsersQuery(1, normalizePageSize(toInt(req.body.pageSize, 10)), safeTrim(req.body.search)) + '&status=danger&message=' + encodeURIComponent('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'));
    }

    const duplicate = await req.prisma.user.findFirst({
      where: {
        OR: [
          { pid },
          { username },
          { email }
        ]
      }
    });

    if (duplicate) {
      return res.redirect(buildUsersQuery(1, normalizePageSize(toInt(req.body.pageSize, 10)), safeTrim(req.body.search)) + '&status=danger&message=' + encodeURIComponent('พบข้อมูลผู้ใช้ซ้ำ pid, username หรือ email'));
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await req.prisma.user.create({
      data: { pid, username, name, email, role, isActive, passwordHash }
    });

    return res.redirect(buildUsersQuery(1, normalizePageSize(toInt(req.body.pageSize, 10)), safeTrim(req.body.search)) + '&status=success&message=' + encodeURIComponent('เพิ่มผู้ใช้งานเรียบร้อยแล้ว'));
  } catch (err) {
    if (err?.code === 'P2002') {
      return res.redirect(buildUsersQuery(1, normalizePageSize(toInt(req.body.pageSize, 10)), safeTrim(req.body.search)) + '&status=danger&message=' + encodeURIComponent('username หรือ email ซ้ำในระบบ'));
    }
    next(err);
  }
});

router.post('/:id/update', ensureAuth, async (req, res, next) => {
  try {
    const pid = parsePid(req.params.id);
    const page = toInt(req.body.page, 1);
    const pageSize = normalizePageSize(toInt(req.body.pageSize, 10));
    const search = safeTrim(req.body.search);
    if (!pid) {
      return res.redirect(buildUsersQuery(page, pageSize, search) + '&status=danger&message=' + encodeURIComponent('ไม่พบรหัสผู้ใช้'));
    }

    const username = safeTrim(req.body.username).toLowerCase();
    const name = safeTrim(req.body.name);
    const email = safeTrim(req.body.email).toLowerCase();
    const role = allowedRoles.has(req.body.role) ? req.body.role : 'user';
    const password = String(req.body.password ?? '');
    const isActive = normalizeBoolean(req.body.isActive);

    if (!username || !name || !email) {
      return res.redirect(buildUsersQuery(page, pageSize, search) + '&status=danger&message=' + encodeURIComponent('กรุณากรอกข้อมูลสำคัญให้ครบถ้วน'));
    }

    const duplicate = await req.prisma.user.findFirst({
      where: {
        AND: [
          { NOT: { pid } },
          {
            OR: [
              { username },
              { email }
            ]
          }
        ]
      }
    });

    if (duplicate) {
      return res.redirect(buildUsersQuery(page, pageSize, search) + '&status=danger&message=' + encodeURIComponent('username หรือ email ซ้ำในระบบ'));
    }

    const data = { username, name, email, role, isActive };
    if (password) {
      if (password.length < 6) {
        return res.redirect(buildUsersQuery(page, pageSize, search) + '&status=danger&message=' + encodeURIComponent('รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร'));
      }
      data.passwordHash = await bcrypt.hash(password, 10);
    }

    await req.prisma.user.update({ where: { pid }, data });
    return res.redirect(buildUsersQuery(page, pageSize, search) + '&status=success&message=' + encodeURIComponent('แก้ไขข้อมูลผู้ใช้งานเรียบร้อยแล้ว'));
  } catch (err) {
    if (err?.code === 'P2002') {
      return res.redirect(buildUsersQuery(toInt(req.body.page, 1), normalizePageSize(toInt(req.body.pageSize, 10)), safeTrim(req.body.search)) + '&status=danger&message=' + encodeURIComponent('username หรือ email ซ้ำในระบบ'));
    }
    next(err);
  }
});

router.post('/:id/toggle-status', ensureAuth, async (req, res, next) => {
  try {
    const pid = parsePid(req.params.id);
    const page = toInt(req.body.page, 1);
    const pageSize = normalizePageSize(toInt(req.body.pageSize, 10));
    const search = safeTrim(req.body.search);

    if (!pid) {
      return res.redirect(buildUsersQuery(page, pageSize, search) + '&status=danger&message=' + encodeURIComponent('ไม่พบรหัสผู้ใช้'));
    }

    const user = await req.prisma.user.findUnique({ where: { pid } });
    if (!user) {
      return res.redirect(buildUsersQuery(page, pageSize, search) + '&status=danger&message=' + encodeURIComponent('ไม่พบข้อมูลผู้ใช้'));
    }

    if (String(req.session?.user?.id) === String(user.pid)) {
      return res.redirect(buildUsersQuery(page, pageSize, search) + '&status=warning&message=' + encodeURIComponent('ไม่สามารถระงับบัญชีที่กำลังใช้งานอยู่ได้'));
    }

    await req.prisma.user.update({
      where: { pid },
      data: { isActive: !user.isActive }
    });

    const message = user.isActive ? 'ระงับการใช้งานเรียบร้อยแล้ว' : 'เปิดใช้งานบัญชีเรียบร้อยแล้ว';
    return res.redirect(buildUsersQuery(page, pageSize, search) + '&status=success&message=' + encodeURIComponent(message));
  } catch (err) {
    next(err);
  }
});

router.post('/:id/delete', ensureAuth, async (req, res, next) => {
  try {
    const pid = parsePid(req.params.id);
    const page = toInt(req.body.page || req.query.page, 1);
    const pageSize = normalizePageSize(toInt(req.body.pageSize || req.query.pageSize, 10));
    const search = safeTrim(req.body.search || req.query.search);

    if (!pid) {
      return res.redirect(buildUsersQuery(page, pageSize, search) + '&status=danger&message=' + encodeURIComponent('ไม่พบรหัสผู้ใช้'));
    }

    if (String(req.session?.user?.id) === String(pid)) {
      return res.redirect(buildUsersQuery(page, pageSize, search) + '&status=warning&message=' + encodeURIComponent('ไม่สามารถลบบัญชีที่กำลังใช้งานอยู่ได้'));
    }

    await req.prisma.user.delete({ where: { pid } });
    return res.redirect(buildUsersQuery(page, pageSize, search) + '&status=success&message=' + encodeURIComponent('ลบผู้ใช้งานเรียบร้อยแล้ว'));
  } catch (err) {
    next(err);
  }
});

export default router;
