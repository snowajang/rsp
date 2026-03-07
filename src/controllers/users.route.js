import { Router } from 'express';
import { ensureAuth } from '../middlewares/auth.js';

const router = Router();

// helper: clamp integer
function toInt(v, fallback) {
  const n = Number.parseInt(String(v ?? ''), 10);
  return Number.isFinite(n) ? n : fallback;
}
function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

router.get('/', ensureAuth, async (req, res, next) => {
  try {
    // รับจาก query string  
    const pageRaw = toInt(req.query.page, 1);
    const pageSizeRaw = toInt(req.query.pageSize, 10);

    // อนุญาตเฉพาะ 10/20/30 ตาม requirement
    const allowedSizes = new Set([10, 20, 30]);
    const pageSize = allowedSizes.has(pageSizeRaw) ? pageSizeRaw : 10;
 
    // เก็บ pageSize แบบ session-only (หายเมื่อปิด browser) ผ่าน cookie session
    // ถ้าคุณยังไม่ได้ใช้ express-session ให้ข้าม 3 บรรทัดนี้ได้
    if (req.session) req.session.usersPageSize = pageSize;

    // ถ้าต้องการให้จำค่า pageSize จาก session (เมื่อ refresh ยังอยู่)
    const finalPageSize = req.session?.usersPageSize && allowedSizes.has(req.session.usersPageSize)
      ? req.session.usersPageSize
      : pageSize;

    const totalItems = await req.prisma.user.count();

    const totalPages = Math.max(1, Math.ceil(totalItems / finalPageSize));
    const page = clamp(pageRaw, 1, totalPages);

    const skip = (page - 1) * finalPageSize;

    const users = await req.prisma.user.findMany({
      orderBy: { pid: 'desc' },
      skip,
      take: finalPageSize,
    });

    // ให้ view ใช้ render pagination
    res.render('users', {
      title: 'User Management',
      users,
      pagination: {
        page,
        pageSize: finalPageSize,
        totalItems,
        totalPages,
        hasPrev: page > 1,
        hasNext: page < totalPages,
      },
      // ใช้ redirect กลับหน้าเดิมตอน delete
      currentQuery: { page, pageSize: finalPageSize },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/', ensureAuth, async (req, res, next) => {
  try {
    const { name, email, role, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).send('name, email & password required');
    }

    return res.status(501).send('User creation via UI not implemented. Please create users via Prisma or DB directly.');
  } catch (err) {
    next(err);
  }
});

// ปรับ delete ให้กลับไปหน้าเดิม (page/pageSize)
router.post('/:id/delete', ensureAuth, async (req, res, next) => {
  try {
    // User primary key is `pid` (BigInt)
    const pid = BigInt(req.params.id);
    await req.prisma.user.delete({ where: { pid } });

    const page = toInt(req.query.page, 1);
    const pageSize = toInt(req.query.pageSize, 10);
    const qs = new URLSearchParams();
    if (page) qs.set('page', String(page));
    if (pageSize) qs.set('pageSize', String(pageSize));

    res.redirect(`/users?${qs.toString()}`);
  } catch (err) {
    next(err);
  }
});

export default router;
