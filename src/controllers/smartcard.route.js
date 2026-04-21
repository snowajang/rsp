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
        const { pid, nameTh, nameEn, address, xdob, birthDate, cid, bp1, laser, issueDate, expiryDate, image } = req.body;
        console.log('Received card data:', req.body);
        console.log('PID:', pid, 'NameTh:', nameTh, 'NameEn:', nameEn, 'Address:', address, 'DOB:', xdob, 'BirthDate:', birthDate, 'CID:', cid, 'BP1:', bp1, 'Laser:', laser, 'IssueDate:', issueDate, 'ExpiryDate:', expiryDate);
        if (
            !pid || !xdob || !birthDate || 
            !image || !issueDate || !expiryDate || 
            !cid || !bp1 || !laser || !nameTh || !nameEn || !address
        ) {
            return res.status(400).send('ไม่สามารถอ่านข้อมูลบัตรประชาชนได้ กรุณาลองใหม่อีกครั้ง');
        }

        const smc = {
            pid: pid || '-',
            nameTh: nameTh || '-',
            nameEn: nameEn || '-',
            address: address || '-',
            xdob: xdob || '-',
            birthDate: birthDate || '-',
            cid: cid || '-',
            bp1: bp1 || '-',
            laser: laser || '-',
            issueDate: issueDate || '-',
            expiryDate: expiryDate || '-',
            image: image || ''
        }

        let rs = await fetch("/api/card/checklaser", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"  
            },
            body: JSON.stringify({
                pid,
                fname: nameTh,
                lname: nameTh,
                dob: xdob,
                laser: smc.laser 
            })
        });
        if (rs.status !== 200) {
            console.error('Error checking laser:', rs.statusText);
            smc.success = false;
            smc.laserCheck = `ไม่สามารถตรวจสอบเลขกำกับบัตรได้ (HTTP ${rs.status})`;
        } else {
            let data = await rs.json();
            if (data.isError) {
                smc.success = false;
                smc.laserCheck = data.isErrorDesc;
            } else {
                smc.success = true;
                smc.laserCheck = `[${data.code}] ${data.desc}`;
            }
        }

        res.render('smc', {
            title: 'อ่านบัตรประจำตัวประชาชน', 
            smc
        });
    } catch (err) {
        next(err);
    } 
});

router.post('/print', ensureAuth, async (req, res, next) => {
    try {
        res.render('smcprint', {
            layout: 'layouts/blank',
            title: 'พิมพ์ข้อมูลบัตรประจำตัวประชาชน',
            smc: req.body
        });
    } catch (err) {
        next(err);
    }
});
export default router;
