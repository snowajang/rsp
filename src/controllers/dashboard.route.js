import { Router } from 'express';
import { ensureAuth } from '../middlewares/auth.js';

const router = Router();

router.get('/', ensureAuth, async (req, res, next) => {
    try {
        const userCount = await req.prisma.user.count();
        const latestUsers = await req.prisma.user.findMany({
            orderBy: { createdAt: 'desc' },
            take: 10
        });

        res.render('dashboard', {
            title: 'Admin Dashboard',
            metrics: { userCount },
            latestUsers
        });
    } catch (err) {
        next(err);
    }
});

export default router;
