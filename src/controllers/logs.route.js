import { Router } from 'express';
import { ensureAuth } from '../middlewares/auth.js';

const router = Router();
const allowedPageSizes = new Set([10, 20, 30, 50]);
const LOG_TYPES = new Set(['audit', 'api']);
const API_STATUSES = new Set(['all', 'success', 'error']);

function safeTrim(value) {
  return String(value ?? '').trim();
}

function toInt(value, fallback) {
  const n = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(n) ? n : fallback;
}

function normalizePageSize(value) {
  return allowedPageSizes.has(value) ? value : 10;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function parseDateStart(value) {
  const v = safeTrim(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const d = new Date(`${v}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseDateEnd(value) {
  const v = safeTrim(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const d = new Date(`${v}T23:59:59.999`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function normalizeLogType(value) {
  return LOG_TYPES.has(value) ? value : 'audit';
}

function normalizeApiStatus(value) {
  return API_STATUSES.has(value) ? value : 'all';
}

function bigintToString(value) {
  return typeof value === 'bigint' ? value.toString() : value;
}

function serializeRecord(record) {
  return JSON.stringify(record, (_, value) => bigintToString(value));
}

function makePrettyJson(record) {
  return JSON.stringify(record ?? {}, (_, value) => bigintToString(value), 2);
}

function buildAuditWhere(filters) {
  const where = {};
  const and = [];

  if (filters.search) {
    and.push({
      OR: [
        { action: { contains: filters.search } },
        { details: { contains: filters.search } }
      ]
    });
  }

  if (filters.userId) {
    try {
      and.push({ userid: BigInt(filters.userId) });
    } catch {
      and.push({ userid: BigInt('0') });
    }
  }

  if (filters.action) {
    and.push({ action: { contains: filters.action } });
  }

  const start = parseDateStart(filters.startDate);
  const end = parseDateEnd(filters.endDate);
  if (start || end) {
    const createdAt = {};
    if (start) createdAt.gte = start;
    if (end) createdAt.lte = end;
    and.push({ createdAt });
  }

  if (and.length) where.AND = and;
  return where;
}

function buildApiWhere(filters) {
  const where = {};
  const and = [];

  if (filters.search) {
    and.push({
      OR: [
        { endpoint: { contains: filters.search } },
        { method: { contains: filters.search } },
        { ipaddress: { contains: filters.search } },
        { details: { contains: filters.search } }
      ]
    });
  }

  if (filters.userId) {
    try {
      and.push({ userid: BigInt(filters.userId) });
    } catch {
      and.push({ userid: BigInt('0') });
    }
  }

  if (filters.method) {
    and.push({ method: filters.method.toUpperCase() });
  }

  if (filters.endpoint) {
    and.push({ endpoint: { contains: filters.endpoint } });
  }

  if (filters.apiStatus === 'success') {
    and.push({ resStatus: { gte: 200, lt: 400 } });
  } else if (filters.apiStatus === 'error') {
    and.push({ OR: [{ resStatus: { gte: 400 } }, { status: { not: 0 } }] });
  }

  const start = parseDateStart(filters.startDate);
  const end = parseDateEnd(filters.endDate);
  if (start || end) {
    const createdAt = {};
    if (start) createdAt.gte = start;
    if (end) createdAt.lte = end;
    and.push({ createdAt });
  }

  if (and.length) where.AND = and;
  return where;
}

function buildQueryString(filters, page) {
  const qs = new URLSearchParams();
  qs.set('type', filters.type);
  qs.set('page', String(page));
  qs.set('pageSize', String(filters.pageSize));
  if (filters.search) qs.set('search', filters.search);
  if (filters.userId) qs.set('userId', filters.userId);
  if (filters.action) qs.set('action', filters.action);
  if (filters.method) qs.set('method', filters.method);
  if (filters.endpoint) qs.set('endpoint', filters.endpoint);
  if (filters.apiStatus && filters.apiStatus !== 'all') qs.set('apiStatus', filters.apiStatus);
  if (filters.startDate) qs.set('startDate', filters.startDate);
  if (filters.endDate) qs.set('endDate', filters.endDate);
  return `/logs?${qs.toString()}`;
}

router.get('/', ensureAuth, async (req, res, next) => {
  try {
    const filters = {
      type: normalizeLogType(safeTrim(req.query.type)),
      pageSize: normalizePageSize(toInt(req.query.pageSize, 10)),
      search: safeTrim(req.query.search),
      userId: safeTrim(req.query.userId),
      action: safeTrim(req.query.action),
      method: safeTrim(req.query.method).toUpperCase(),
      endpoint: safeTrim(req.query.endpoint),
      apiStatus: normalizeApiStatus(safeTrim(req.query.apiStatus) || 'all'),
      startDate: safeTrim(req.query.startDate),
      endDate: safeTrim(req.query.endDate)
    };

    const pageRaw = toInt(req.query.page, 1);
    const auditWhere = buildAuditWhere(filters);
    const apiWhere = buildApiWhere(filters);

    const [auditTotal, apiTotal, recentAudit, recentApi] = await Promise.all([
      req.prisma.userlog.count({ where: auditWhere }),
      req.prisma.applog.count({ where: apiWhere }),
      req.prisma.userlog.count({ where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }),
      req.prisma.applog.count({ where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } })
    ]);

    const totalItems = filters.type === 'audit' ? auditTotal : apiTotal;
    const totalPages = Math.max(1, Math.ceil(totalItems / filters.pageSize));
    const page = clamp(pageRaw, 1, totalPages);
    const skip = (page - 1) * filters.pageSize;

    let auditLogs = [];
    let apiLogs = [];

    if (filters.type === 'audit') {
      auditLogs = await req.prisma.userlog.findMany({
        where: auditWhere,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take: filters.pageSize
      });
    } else {
      apiLogs = await req.prisma.applog.findMany({
        where: apiWhere,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take: filters.pageSize
      });
    }

    const actionOptions = await req.prisma.userlog.findMany({
      select: { action: true },
      distinct: ['action'],
      orderBy: { action: 'asc' },
      take: 100
    });

    const methodOptions = await req.prisma.applog.findMany({
      select: { method: true },
      distinct: ['method'],
      orderBy: { method: 'asc' },
      take: 20
    });

    res.render('logs', {
      title: 'Log Management',
      activeType: filters.type,
      filters,
      summary: {
        auditTotal,
        apiTotal,
        recentAudit,
        recentApi
      },
      pagination: {
        page,
        pageSize: filters.pageSize,
        totalItems,
        totalPages,
        hasPrev: page > 1,
        hasNext: page < totalPages,
        prevUrl: buildQueryString(filters, Math.max(1, page - 1)),
        nextUrl: buildQueryString(filters, Math.min(totalPages, page + 1))
      },
      auditLogs: auditLogs.map((item) => ({
        ...item,
        useridText: item.userid?.toString?.() || '-',
        modalJson: makePrettyJson(item),
        modalData: encodeURIComponent(serializeRecord(item))
      })),
      apiLogs: apiLogs.map((item) => ({
        ...item,
        useridText: item.userid?.toString?.() || '-',
        modalJson: makePrettyJson(item),
        modalData: encodeURIComponent(serializeRecord(item))
      })),
      actionOptions: actionOptions.map((item) => item.action).filter(Boolean),
      methodOptions: methodOptions.map((item) => item.method).filter(Boolean)
    });
  } catch (err) {
    next(err);
  }
});

export default router;
