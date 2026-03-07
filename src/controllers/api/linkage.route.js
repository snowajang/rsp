import { Router } from 'express';

const router = Router();

/**
 * @swagger
 * /linkage/api/login/smc:
 *   post:
 *     tags:
 *       - Linkage Login
 *     summary: Login ด้วยบัตร Smart Card (SMC)
 *     description: ใช้เลขประจำตัวประชาชน (pid) และ chipNo (cid) เพื่อขอ token จาก Linkage Center
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - pid
 *               - cid
 *             properties:
 *               pid:
 *                 type: string
 *                 description: เลขประจำตัวประชาชน 13 หลัก
 *                 example: "1234567890123"
 *               cid:
 *                 type: string
 *                 description: เลข chip ของ Smart Card
 *                 example: "A1B2C3D4E5F6"
 *     responses:
 *       200:
 *         description: Login สำเร็จ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorNumber:
 *                   type: integer
 *                 errorMessage:
 *                   type: string
 *                   nullable: true
 *                 data:
 *                   type: object
 *       400:
 *         description: ข้อมูลไม่ครบ (pid หรือ cid ไม่มี)
 *       500:
 *         description: Server error ภายในระบบ
 */
router.post('/api/login/smc', async (req, res, next) => {
    try {
        const { pid, cid } = req.body;
        if (!pid || !cid) {
            return res.status(400).json({ error: 'body not variable is required' });
        }
        
        const request = {
            method: 'POST',
            headers: { 
                'Connection': 'close',
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({    
                officeID : req.officeID,
                loginType: 1,
                personalID : pid,
                chipNo : cid           
            })
        }
        const response = await fetch(`${process.env.LINKAGE_API_BASE_URL}/api/center/login/`, request);
        const data = await response.json();
        if (!response.ok) {
            return res.status(response.status).json({ errorNumber: data.errorNumber, errorMessage: data.errorMessage, data: null });
        } else {
            return res.status(response.status).json({ errorNumber: 0, errorMessage: null, data });
        }
    } catch (err) {
        next(err);
    }
});

/**
 * @swagger
 * /linkage/api/login/smc/auth:
 *   post:
 *     tags:
 *       - Linkage Login
 *     summary: ยืนยันตัวตน SMC (Smart Card) ด้วย random/envelope
 *     description: ใช้ smcToken และค่าที่ลงนามจากบัตรในการยืนยัน login
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - smcToken
 *               - xrandom
 *               - xenvelop
 *             properties:
 *               xrandom:
 *                 type: string
 *                 description: ค่า random ที่ได้จาก Linkage
 *               xenvelop:
 *                 type: string
 *                 description: envelope ที่ได้จากบัตร
 *     responses:
 *       200:
 *         description: ยืนยันตัวตนสำเร็จ
 *       400:
 *         description: ข้อมูลไม่ครบ (xrandom หรือ xenvelop ไม่มี)
 *       500:
 *         description: Server error
 */
router.post('/api/login/smc/auth', async (req, res, next) => {
    try {
        const { xrandom, xenvelop } = req.body;
        if (!xrandom || !xenvelop) {
            return res.status(400).json({ error: 'SMC token is required' });
        }
        
        const request = {
            method: 'POST',
            headers: { 
                'Connection': 'close',
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({    
                officeID : req.officeID,
                loginType: 1,
                random : xrandom,
                envelope : xenvelop
            })
        }
        const response = await fetch(`${process.env.LINKAGE_API_BASE_URL}/api/center/login/confirm`, request);
        const data = await response.json();
        if (!response.ok) {
            return res.status(response.status).json({ errorNumber: data.errorNumber, errorMessage: data.errorMessage, data: null });
        } else {
            return res.status(response.status).json({ errorNumber: 0, errorMessage: null, data });
        }
    } catch (err) {
        next(err);
    }
});

/**
 * @swagger
 * /linkage/api/login/thaid/auth:
 *   post:
 *     tags:
 *       - Linkage Login
 *     summary: Login ด้วย ThaiD
 *     description: ใช้ accessToken จาก ThaiD เพื่อขอ token จาก Linkage Center
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - accessToken
 *             properties:
 *               pid:
 *                 type: string
 *                 description: เลขประจำตัวประชาชน (อาจใช้หรือไม่ใช้แล้วแต่ backend)
 *               name:
 *                 type: string
 *                 description: ชื่อ-สกุล ผู้ใช้งาน
 *               accessToken:
 *                 type: string
 *                 description: Access token ที่ได้จาก ThaiD
 *                 example: "eyJhbGciOi..."
 *     responses:
 *       200:
 *         description: Login ThaiD สำเร็จ
 *       400:
 *         description: ไม่พบ accessToken
 *       500:
 *         description: Server error
 */
router.post('/api/login/thaid/auth', async (req, res, next) => {
    try { 
        const { pid, name, accessToken } = req.body;
        if (!accessToken) {
            return res.status(400).json({ error: 'thaid accesstoken is required' });
        }
        
        const request = {
            method: 'POST',
            headers: { 
                'Connection': 'close',
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({    
                officeID : req.officeID,
                loginType: 2,
                personalID : pid,
                accessToken : accessToken                
            })
        }
        console.log('Request Body:', request.body); // Log the request body for debugging
        const response = await fetch(`${process.env.LINKAGE_API_BASE_URL}/api/center/login/confirm`, request);
        const data = await response.json();
        if (!response.ok) {
            return res.status(response.status).json({ errorNumber: data.errorNumber, errorMessage: data.errorMessage, data: null });
        } else {
            return res.status(response.status).json({ errorNumber: 0, errorMessage: null, data });
        }
    } catch (err) {
        next(err);
    }
});

/**
 * @swagger
 * /linkage/api/user:
 *   post:
 *     tags:
 *       - Linkage User
 *     summary: ดึงข้อมูลสิทธิ์/หน้าที่การงานของผู้ใช้
 *     description: ใช้ token จาก Linkage เพื่อตรวจสอบข้อมูล user job/role
 *     parameters:
 *       - in: header
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Token ที่ได้จากการ login Linkage
 *     responses:
 *       200:
 *         description: ดึงข้อมูล user สำเร็จ
 *       400:
 *         description: ไม่พบ token หรือ token ไม่ถูกต้อง
 *       500:
 *         description: Server error
 */
router.post('/api/user', async (req, res, next) => {
    try {
        const { token } = req.headers;
        // NOTE: โค้ดเดิมเช็ค smcToken ตรงนี้ น่าจะต้องแก้เป็น token
        if (!token) {
            return res.status(400).json({ error: 'Not Autherize token is required' });
        }
        
        const request = {
            method: 'GET',
            headers: { 
                'Connection': 'close',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        }
        const response = await fetch(`${process.env.LINKAGE_API_BASE_URL}/api/center/user/job`, request);
        const data = await response.json();
        if (!response.ok) {
            return res.status(response.status).json({ errorNumber: data.errorNumber, errorMessage: data.errorMessage, data: null });
        } else {
            return res.status(response.status).json({ errorNumber: 0, errorMessage: null, data });
        }
    } catch (error) {
        next(err);
    }
});

/**
 * @swagger
 * /linkage/api/search:
 *   post:
 *     tags:
 *       - Linkage Request
 *     summary: ค้นหาข้อมูลโดยส่งคำขอไปยัง Linkage Center
 *     description: ใช้ token และ body ตามรูปแบบคำขอของ Linkage Center (forward body ตรง ๆ)
 *     parameters:
 *       - in: header
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Token ที่ได้จากการ login Linkage
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Payload สำหรับเรียก /api/center/request/ (รูปแบบขึ้นกับประเภทบริการ)
 *     responses:
 *       200:
 *         description: ค้นหาสำเร็จ
 *       400:
 *         description: ไม่พบ token
 *       500:
 *         description: Server error
 */
router.post('/api/search', async (req, res, next) => {
    try {
        const { token } = req.headers;
        if (!token) {
            return res.status(400).json({ error: 'Not Autherize token is required' });
        }
        
        const request = {
            method: 'POST',
            headers: { 
                'Connection': 'close',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(req.body)
        }
        const response = await fetch(`${process.env.LINKAGE_API_BASE_URL}/api/center/request/`, request);
        const data = await response.json();
        if (!response.ok) {
            return res.status(response.status).json({ errorNumber: data.errorNumber, errorMessage: data.errorMessage, data: null });
        } else {
            return res.status(response.status).json({ errorNumber: 0, errorMessage: null, data });
        }
    } catch (error) {
        next(err);
    }
});

/**
 * @swagger
 * /linkage/api/renew:
 *   post:
 *     tags:
 *       - Linkage Session
 *     summary: ต่ออายุ (renew) token ของ Linkage
 *     description: ใช้ token ที่จะต่ออายุ ส่งไปยัง /api/center/login/renew
 *     parameters:
 *       - in: header
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Token ที่ต้องการต่ออายุ
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: ข้อมูลเพิ่มเติม (หาก backend ต้องการ)
 *     responses:
 *       200:
 *         description: ต่ออายุ token สำเร็จ
 *       400:
 *         description: ไม่พบ token
 *       500:
 *         description: Server error
 */
router.post('/api/renew', async (req, res, next) => {
    try {
        const { token } = req.headers;
        if (!token) {
            return res.status(400).json({ error: 'Not Autherize token is required' });
        }
        
        const request = {
            method: 'POST',
            headers: { 
                'Connection': 'close',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(req.body)
        }
        const response = await fetch(`${process.env.LINKAGE_API_BASE_URL}/api/center/login/renew`, request);
        const data = await response.json();
        if (!response.ok) {
            return res.status(response.status).json({ errorNumber: data.errorNumber, errorMessage: data.errorMessage, data: null });
        } else {
            return res.status(response.status).json({ errorNumber: 0, errorMessage: null, data });
        }
    } catch (error) {
        next(err);
    }
});

/**
 * @swagger
 * /linkage/api/logout:
 *   post:
 *     tags:
 *       - Linkage Session
 *     summary: Logout ออกจาก Linkage Center
 *     description: ใช้ token เพื่อลบ session ที่ Linkage Center
 *     parameters:
 *       - in: header
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Token ที่ต้องการ logout
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Payload เพิ่มเติม (ถ้ามี)
 *     responses:
 *       200:
 *         description: Logout สำเร็จ
 *       400:
 *         description: ไม่พบ token
 *       500:
 *         description: Server error
 */
router.post('/api/logout', async (req, res, next) => {
    try {
        const { token } = req.headers;
        if (!token) {
            return res.status(400).json({ error: 'Not Autherize token is required' });
        }
        
        const request = {
            method: 'DELETE',
            headers: { 
                'Connection': 'close',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(req.body)
        }
        const response = await fetch(`${process.env.LINKAGE_API_BASE_URL}/api/center/login/`, request);
        const data = await response.json();
        if (!response.ok) {
            return res.status(response.status).json({ errorNumber: data.errorNumber, errorMessage: data.errorMessage, data: null });
        } else {
            return res.status(response.status).json({ errorNumber: 0, errorMessage: null, data });
        }
    } catch (error) {
        next(err);
    }
});

export default router;
