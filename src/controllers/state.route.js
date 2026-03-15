import { Router } from 'express';
import { ensureAuth } from '../middlewares/auth.js';

const router = Router();

const allowedPageSizes = new Set([10, 20, 30]);
const scopeFields = [
  { key: 'pid', label: 'เลขประจำตัวประชาชน pid' },
  { key: 'name', label: 'ชื่อ สกุล ภาษาไทย name' },
  { key: 'title', label: 'คำนำหน้า ภาษาไทย title' },
  { key: 'given_name', label: 'ชื่อตัว ภาษาไทย given_name' },
  { key: 'middle_name', label: 'ชื่อรอง ภาษาไทย middle_name' },
  { key: 'family_name', label: 'นามสกุล ภาษาไทย family_name' },
  { key: 'name_en', label: 'ชื่อ สกุล ภาษาอังกฤษ name_en' },
  { key: 'title_en', label: 'คำนำหน้า ภาษาอังกฤษ title_en' },
  { key: 'given_name_en', label: 'ชื่อตัว ภาษาอังกฤษ given_name_en' },
  { key: 'middle_name_en', label: 'ชื่อรอง ภาษาอังกฤษ middle_name_en' },
  { key: 'family_name_en', label: 'นามสกุล ภาษาอังกฤษ family_name_en' },
  { key: 'birthdate', label: 'วันเกิด ภาษาอังกฤษ birthdate' },
  { key: 'gender', label: 'เพศ ภาษาอังกฤษ gender' },
  { key: 'address', label: 'ที่อยู่ ตามหน้าบัตร address' },
  { key: 'house_address', label: 'ที่อยู่ ตามทะเบียนราษฎร house_address' },
  { key: 'smartcard_code', label: 'เลขใต้รูป smartcard_code' },
  { key: 'date_of_issuance', label: 'วันที่ออกบัตรประจำตัวประชาชน date_of_issuance' },
  { key: 'date_of_expiry', label: 'วันที่บัตรหมดอายุประจำตัวประชาชน date_of_expiry' },
];
const scopeKeySet = new Set(scopeFields.map((item) => item.key));

function safeTrim(value) {
  return String(value ?? '').trim();
}

function toInt(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizePageSize(value) {
  return allowedPageSizes.has(value) ? value : 10;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function parseBigIntOrZero(value) {
  const raw = safeTrim(value);
  if (!raw) return BigInt(0);
  if (!/^\d+$/.test(raw)) return null;
  try {
    return BigInt(raw);
  } catch {
    return null;
  }
}

function normalizeStateKey(value) {
  return safeTrim(value);
}

function normalizeReturnUrl(value) {
  return safeTrim(value);
}

function normalizeBoolean(value) {
  return value === true || value === 'true' || value === '1' || value === 'on';
}

function scopeFromBody(body) {
  return scopeFields
    .map((item) => item.key)
    .filter((key) => normalizeBoolean(body[key]));
}

function parseScopeValue(scopeValue) {
  if (!scopeValue) return [];
  try {
    const parsed = JSON.parse(scopeValue);
    if (Array.isArray(parsed)) {
      return parsed.filter((key) => scopeKeySet.has(key));
    }
    if (Array.isArray(parsed?.data)) {
      return parsed.data.filter((key) => scopeKeySet.has(key));
    }
    return [];
  } catch {
    return [];
  }
}

function serializeScope(scopeArray) {
  return JSON.stringify({ data: scopeArray.filter((key) => scopeKeySet.has(key)) });
}

function buildWhere(search, statusFilter) {
  const where = {};
  const keyword = safeTrim(search);

  if (statusFilter === 'deleted') {
    where.isDeleted = true;
  } else if (statusFilter === 'suspended') {
    where.isDeleted = false;
    where.isActive = false;
  } else {
    where.isDeleted = false;
  }

  if (keyword) {
    where.OR = [
      { istate: { contains: keyword } },
      { returnurl: { contains: keyword } },
      { scope: { contains: keyword } },
    ];

    if (/^\d+$/.test(keyword)) {
      try {
        where.OR.push({ userpid: BigInt(keyword) });
      } catch {}
    }
  }

  return where;
}

function emptyFormData() {
  return {
    istate: '',
    returnurl: '',
    userpid: '0',
    isActive: true,
    selectedScopes: [],
  };
}

function buildRedirect(page, pageSize, search, statusFilter, type, message) {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('pageSize', String(pageSize));
  if (search) params.set('search', search);
  if (statusFilter) params.set('statusFilter', statusFilter);
  if (type) params.set('status', type);
  if (message) params.set('message', message);
  return `/state?${params.toString()}`;
}

async function loadOwners(prisma) {
  const users = await prisma.user.findMany({
    select: { pid: true, name: true, username: true, role: true, isActive: true },
    orderBy: [{ role: 'asc' }, { name: 'asc' }, { username: 'asc' }],
  });

  return users.map((user) => ({
    pid: user.pid.toString(),
    label: `${user.role === 'admin' ? '[Admin]' : '[User]'} ${user.name} (${user.username})${user.isActive ? '' : ' - Suspended'}`,
  }));
}

router.get('/', ensureAuth, async (req, res, next) => {
  try {
    const pageRaw = toInt(req.query.page, 1);
    const pageSizeRaw = toInt(req.query.pageSize, 10);
    const pageSize = normalizePageSize(pageSizeRaw);
    const search = safeTrim(req.query.search);
    const statusFilter = ['active', 'suspended', 'deleted'].includes(req.query.statusFilter)
      ? req.query.statusFilter
      : 'active';

    const where = buildWhere(search, statusFilter);
    const totalItems = await req.prisma.thaid.count({ where });
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const page = clamp(pageRaw, 1, totalPages);
    const skip = (page - 1) * pageSize;

    const [stateApps, owners] = await Promise.all([
      req.prisma.thaid.findMany({
        where,
        orderBy: [{ updatedAt: 'desc' }, { istate: 'asc' }],
        skip,
        take: pageSize,
      }),
      loadOwners(req.prisma),
    ]);

    const ownerMap = new Map(owners.map((owner) => [owner.pid, owner.label]));
    const rows = stateApps.map((item) => ({
      ...item,
      selectedScopes: parseScopeValue(item.scope),
      ownerLabel: item.userpid && item.userpid !== BigInt(0)
        ? ownerMap.get(item.userpid.toString()) || `PID ${item.userpid.toString()}`
        : 'ผู้ดูแลระบบ',
    }));

    res.render('state', {
      title: 'ThaiD App Management',
      apps: rows,
      scopeFields,
      owners,
      filters: { search, statusFilter },
      formData: emptyFormData(),
      flash: {
        type: req.query.status || null,
        message: req.query.message || null,
      },
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages,
        hasPrev: page > 1,
        hasNext: page < totalPages,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/', ensureAuth, async (req, res, next) => {
  try {
    const page = toInt(req.body.page, 1);
    const pageSize = normalizePageSize(toInt(req.body.pageSize, 10));
    const search = safeTrim(req.body.search);
    const statusFilter = ['active', 'suspended', 'deleted'].includes(req.body.statusFilter)
      ? req.body.statusFilter
      : 'active';

    const istate = normalizeStateKey(req.body.istate);
    const returnurl = normalizeReturnUrl(req.body.returnurl);
    const userpid = parseBigIntOrZero(req.body.userpid);
    const selectedScopes = scopeFromBody(req.body);
    const isActive = normalizeBoolean(req.body.isActive);

    if (!istate) {
      return res.redirect(buildRedirect(page, pageSize, search, statusFilter, 'danger', 'กรุณากรอกค่า state'));
    }
    if (!returnurl) {
      return res.redirect(buildRedirect(page, pageSize, search, statusFilter, 'danger', 'กรุณากรอก Return URL'));
    }
    if (userpid === null) {
      return res.redirect(buildRedirect(page, pageSize, search, statusFilter, 'danger', 'รูปแบบผู้รับผิดชอบไม่ถูกต้อง'));
    }

    const exists = await req.prisma.thaid.findUnique({
      where: { istate_termdate: { istate, termdate: 0 } },
    });
    if (exists) {
      return res.redirect(buildRedirect(page, pageSize, search, statusFilter, 'warning', `state ${istate} มีอยู่แล้วในระบบ`));
    }

    await req.prisma.thaid.create({
      data: {
        istate,
        termdate: 0,
        returnurl,
        scope: serializeScope(selectedScopes),
        userpid,
        isActive,
        isDeleted: false,
        deletedAt: null,
      },
    });

    return res.redirect(buildRedirect(1, pageSize, search, statusFilter, 'success', `เพิ่มรายการ ThaiD state ${istate} สำเร็จ`));
  } catch (err) {
    if (err?.code === 'P2002') {
      return res.redirect(buildRedirect(1, 10, '', 'active', 'warning', 'state นี้ถูกใช้งานแล้ว'));
    }
    next(err);
  }
});

router.post('/:istate/update', ensureAuth, async (req, res, next) => {
  try {
    const currentState = normalizeStateKey(req.params.istate);
    const page = toInt(req.body.page, 1);
    const pageSize = normalizePageSize(toInt(req.body.pageSize, 10));
    const search = safeTrim(req.body.search);
    const statusFilter = ['active', 'suspended', 'deleted'].includes(req.body.statusFilter)
      ? req.body.statusFilter
      : 'active';

    const nextState = normalizeStateKey(req.body.istate);
    const returnurl = normalizeReturnUrl(req.body.returnurl);
    const userpid = parseBigIntOrZero(req.body.userpid);
    const selectedScopes = scopeFromBody(req.body);
    const isActive = normalizeBoolean(req.body.isActive);

    if (!nextState) {
      return res.redirect(buildRedirect(page, pageSize, search, statusFilter, 'danger', 'กรุณากรอกค่า state'));
    }
    if (!returnurl) {
      return res.redirect(buildRedirect(page, pageSize, search, statusFilter, 'danger', 'กรุณากรอก Return URL'));
    }
    if (userpid === null) {
      return res.redirect(buildRedirect(page, pageSize, search, statusFilter, 'danger', 'รูปแบบผู้รับผิดชอบไม่ถูกต้อง'));
    }

    const existing = await req.prisma.thaid.findUnique({
      where: { istate_termdate: { istate: currentState, termdate: 0 } },
    });
    if (!existing) {
      return res.redirect(buildRedirect(page, pageSize, search, statusFilter, 'warning', 'ไม่พบข้อมูล ThaiD app ที่ต้องการแก้ไข'));
    }

    if (nextState !== currentState) {
      const duplicate = await req.prisma.thaid.findUnique({
        where: { istate_termdate: { istate: nextState, termdate: 0 } },
      });
      if (duplicate) {
        return res.redirect(buildRedirect(page, pageSize, search, statusFilter, 'warning', `state ${nextState} ซ้ำในระบบ`));
      }
    }

    if (nextState !== currentState) {
      await req.prisma.$transaction([
        req.prisma.thaid.create({
          data: {
            ...existing,
            istate: nextState,
            termdate: 0,
            returnurl,
            scope: serializeScope(selectedScopes),
            userpid,
            isActive,
            isDeleted: existing.isDeleted,
            deletedAt: existing.deletedAt,
            createdAt: existing.createdAt,
            updatedAt: new Date(),
          },
        }),
        req.prisma.thaid.delete({ where: { istate_termdate: { istate: currentState, termdate: 0 } } }),
      ]);
    } else {
      await req.prisma.thaid.update({
        where: { istate_termdate: { istate: currentState, termdate: 0 } },
        data: {
          returnurl,
          scope: serializeScope(selectedScopes),
          userpid,
          isActive,
        },
      });
    }

    return res.redirect(buildRedirect(page, pageSize, search, statusFilter, 'success', `บันทึกข้อมูล state ${nextState} สำเร็จ`));
  } catch (err) {
    next(err);
  }
});

router.post('/:istate/toggle-status', ensureAuth, async (req, res, next) => {
  try {
    const istate = normalizeStateKey(req.params.istate);
    const page = toInt(req.body.page, 1);
    const pageSize = normalizePageSize(toInt(req.body.pageSize, 10));
    const search = safeTrim(req.body.search);
    const statusFilter = ['active', 'suspended', 'deleted'].includes(req.body.statusFilter)
      ? req.body.statusFilter
      : 'active';

    const record = await req.prisma.thaid.findUnique({ where: { istate_termdate: { istate, termdate: 0 } } });
    if (!record) {
      return res.redirect(buildRedirect(page, pageSize, search, statusFilter, 'warning', 'ไม่พบรายการที่ต้องการเปลี่ยนสถานะ'));
    }
    if (record.isDeleted) {
      return res.redirect(buildRedirect(page, pageSize, search, statusFilter, 'warning', 'รายการที่ถูกลบแล้วไม่สามารถระงับได้'));
    }

    await req.prisma.thaid.update({
      where: { istate_termdate: { istate, termdate: 0 } },
      data: { isActive: !record.isActive },
    });

    return res.redirect(buildRedirect(page, pageSize, search, statusFilter, 'success', `${record.isActive ? 'ระงับ' : 'เปิดใช้งาน'} state ${istate} สำเร็จ`));
  } catch (err) {
    next(err);
  }
});

router.post('/:istate/delete', ensureAuth, async (req, res, next) => {
  try {
    const istate = normalizeStateKey(req.params.istate);
    const page = toInt(req.body.page, 1);
    const pageSize = normalizePageSize(toInt(req.body.pageSize, 10));
    const search = safeTrim(req.body.search);
    const statusFilter = ['active', 'suspended', 'deleted'].includes(req.body.statusFilter)
      ? req.body.statusFilter
      : 'active';

    const record = await req.prisma.thaid.findUnique({ where: { istate_termdate: { istate, termdate: 0 } } });
    if (!record) {
      return res.redirect(buildRedirect(page, pageSize, search, statusFilter, 'warning', 'ไม่พบรายการที่ต้องการลบ'));
    }

    await req.prisma.thaid.update({
      where: { istate_termdate: { istate, termdate: 0 } },
      data: {
        isDeleted: true,
        isActive: false,
        deletedAt: new Date(),
      },
    });

    return res.redirect(buildRedirect(page, pageSize, search, statusFilter, 'success', `ย้าย state ${istate} ไปยังรายการที่ถูกลบแล้ว`));
  } catch (err) {
    next(err);
  }
});

router.post('/:istate/restore', ensureAuth, async (req, res, next) => {
  try {
    const istate = normalizeStateKey(req.params.istate);
    const page = toInt(req.body.page, 1);
    const pageSize = normalizePageSize(toInt(req.body.pageSize, 10));
    const search = safeTrim(req.body.search);
    const statusFilter = ['active', 'suspended', 'deleted'].includes(req.body.statusFilter)
      ? req.body.statusFilter
      : 'deleted';

    const record = await req.prisma.thaid.findUnique({ where: { istate_termdate: { istate, termdate: 0 } } });
    if (!record) {
      return res.redirect(buildRedirect(page, pageSize, search, statusFilter, 'warning', 'ไม่พบรายการที่ต้องการคืนค่า'));
    }

    await req.prisma.thaid.update({
      where: { istate_termdate: { istate, termdate: 0 } },
      data: {
        isDeleted: false,
        isActive: true,
        deletedAt: null,
      },
    });

    return res.redirect(buildRedirect(page, pageSize, search, statusFilter, 'success', `คืนค่า state ${istate} สำเร็จ`));
  } catch (err) {
    next(err);
  }
});

export default router;
