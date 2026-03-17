import { Router } from 'express';

const router = Router();

router.get('/', async (req, res, next) => {
    try {
        const states = await req.prisma.thaiState.findMany({    
            where: { state: req.query?.state || '' }
        });
        if (!states || states.length === 0) {
            return res.status(404).json({ errorNumber: 9998, errorMessage: "ไม่พบข้อมูล", data: null });
        } else {
            return res.json({ errorNumber: 0, errorMessage: null, data: states });
        }        
    } catch (error) {
        console.log('Logout Error:', error);
        return res.status(response?.status || 500).json({ errorNumber: 9999, errorMessage: "พบปัญหากรุณาติดต่อผู้ดูแลระบบ", data: null });
    }
});

export default router;