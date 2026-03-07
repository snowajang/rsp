import { Router } from 'express';
import { ensureAuth } from '../middlewares/auth.js';

const router = Router();

router.get('/', ensureAuth, async (req, res, next) => {
    try {
        const smc = {
            pid: '-',
            nameTh: '-',
            nameEn: '-',
            address: '-',
            sex: '-',
            birthDate: '-',
            issueDate: '-',
            expiryDate: '-',
            image: '',
            nimage: ''
        }

        res.render('smc', {
            title: 'อ่านบัตรประจำตัวประชาชน',
            smc
        });
    } catch (err) {
        next(err);
    }
});

router.post('/', ensureAuth, async (req, res, next) => {
    try {
        const { pid, title, fname, mname, lanme, titleEn, fnameEn, mnameEn, lnameEn, sex, image, nimage,birthDate, issueDate, expiryDate } = req.body;

        if (
            !pid || !title || !fname || !mname || !lanme || 
            !titleEn || !fnameEn || !mnameEn || !lnameEn || !sex || !birthDate || 
            !image || !nimage || !issueDate || !expiryDate
        ) {
            return res.status(400).send('ไม่สามารถอ่านข้อมูลบัตรประชาชนได้ กรุณาลองใหม่อีกครั้ง');
        }

        const smc = {
            pid: '-',
            nameTh: '-',
            nameEn: '-',
            address: '-',
            sex: '-',
            birthDate: '-',
            issueDate: '-',
            expiryDate: '-',
            image: '',
            nimage: ''
        }
        res.render('smc', {
            title: 'อ่านบัตรประจำตัวประชาชน',
            smc
        });
    } catch (err) {
        next(err);
    } 
});

export default router;
