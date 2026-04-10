import { Router } from 'express';
import { ensureAuth } from '../../middlewares/auth.js';

const router = Router();

function toInt(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function toJsonReady(value) {
  return JSON.parse(JSON.stringify(value, (_, v) => typeof v === 'bigint' ? v.toString() : v));
}

router.get('/app', ensureAuth, async (req, res, next) => {
  try {
    const pageRaw = toInt(req.query.page, 1);
    const pageSize = clamp(toInt(req.query.pageSize, 20), 1, 100);
    const method = String(req.query.method || '').trim().toUpperCase();
    const endpoint = String(req.query.endpoint || '').trim();
    const status = String(req.query.status || '').trim();

    const where = {};
    if (method) where.method = method;
    if (endpoint) where.endpoint = { contains: endpoint };
    if (status === 'success') where.status = 1;
    if (status === 'error') where.status = 0;

    const totalItems = await req.prisma.applog.count({ where });
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const page = clamp(pageRaw, 1, totalPages);

    const rows = await req.prisma.applog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return res.json({
      errorNumber: 0,
      errorMessage: null,
      data: {
        items: toJsonReady(rows),
        pagination: { page, pageSize, totalItems, totalPages },
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get('/user', ensureAuth, async (req, res, next) => {
  try {
    const pageRaw = toInt(req.query.page, 1);
    const pageSize = clamp(toInt(req.query.pageSize, 20), 1, 100);
    const action = String(req.query.action || '').trim();
    const userId = String(req.query.userId || '').trim();

    const where = {};
    if (action) where.action = { contains: action };
    if (userId && /^\d+$/.test(userId)) where.userid = BigInt(userId);

    const totalItems = await req.prisma.userlog.count({ where });
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const page = clamp(pageRaw, 1, totalPages);

    const rows = await req.prisma.userlog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return res.json({
      errorNumber: 0,
      errorMessage: null,
      data: {
        items: toJsonReady(rows),
        pagination: { page, pageSize, totalItems, totalPages },
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get('/summary', ensureAuth, async (req, res, next) => {
  try {
    const [appLogCount, userLogCount, latestAppLogs, latestUserLogs] = await Promise.all([
      req.prisma.applog.count(),
      req.prisma.userlog.count(),
      req.prisma.applog.findMany({ orderBy: { createdAt: 'desc' }, take: 10 }),
      req.prisma.userlog.findMany({ orderBy: { createdAt: 'desc' }, take: 10 }),
    ]);

    return res.json({
      errorNumber: 0,
      errorMessage: null,
      data: {
        totals: { appLogCount, userLogCount },
        latestAppLogs: toJsonReady(latestAppLogs),
        latestUserLogs: toJsonReady(latestUserLogs),
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
