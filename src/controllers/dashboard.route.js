import { Router } from 'express';
import { ensureAuth } from '../middlewares/auth.js';

const router = Router();

function toPlainStatusMap(groups = []) {
  const map = {};
  for (const row of groups) {
    const code = Number(row.resStatus ?? 0);
    if (!Number.isFinite(code)) continue;
    map[code] = Number(row._count?._all ?? 0);
  }
  return map;
}

function sumStatusRange(statusMap, min, max) {
  return Object.entries(statusMap).reduce((sum, [code, count]) => {
    const n = Number(code);
    return n >= min && n <= max ? sum + Number(count) : sum;
  }, 0);
}

router.get('/', ensureAuth, async (req, res, next) => {
  try {
    const [
      totalUsers,
      activeUsers,
      suspendedUsers,
      deletedUsers,
      totalThaid,
      activeThaid,
      suspendedThaid,
      deletedThaid,
      totalApiLogs,
      latestUsers,
      recentApiLogs,
      apiStatusGroups,
    ] = await Promise.all([
      req.prisma.member.count(),
      req.prisma.member.count({ where: { isDeleted: false, isActive: true } }),
      req.prisma.member.count({ where: { isDeleted: false, isActive: false } }),
      req.prisma.member.count({ where: { isDeleted: true } }),
      req.prisma.thaid.count(),
      req.prisma.thaid.count({ where: { isDeleted: false, isActive: true } }),
      req.prisma.thaid.count({ where: { isDeleted: false, isActive: false } }),
      req.prisma.thaid.count({ where: { isDeleted: true } }),
      req.prisma.applog.count(),
      req.prisma.member.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      req.prisma.applog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      req.prisma.applog.groupBy({
        by: ['resStatus'],
        _count: { _all: true },
        orderBy: { resStatus: 'asc' },
      }),
    ]);

    const apiStatusMap = toPlainStatusMap(apiStatusGroups);

    res.render('dashboard', {
      title: 'Admin Dashboard',
      metrics: {
        users: {
          total: totalUsers,
          active: activeUsers,
          suspended: suspendedUsers,
          deleted: deletedUsers,
        },
        thaid: {
          total: totalThaid,
          active: activeThaid,
          suspended: suspendedThaid,
          deleted: deletedThaid,
        },
        api: {
          total: totalApiLogs,
          byClass: {
            s2xx: sumStatusRange(apiStatusMap, 200, 299),
            s3xx: sumStatusRange(apiStatusMap, 300, 399),
            s4xx: sumStatusRange(apiStatusMap, 400, 499),
            s5xx: sumStatusRange(apiStatusMap, 500, 599),
            other: Object.entries(apiStatusMap).reduce((sum, [code, count]) => {
              const n = Number(code);
              return n < 200 || n > 599 ? sum + Number(count) : sum;
            }, 0),
          },
          byStatus: Object.entries(apiStatusMap)
            .sort((a, b) => Number(a[0]) - Number(b[0]))
            .map(([status, count]) => ({ status: Number(status), count: Number(count) })),
        },
      },
      latestUsers,
      recentApiLogs,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
