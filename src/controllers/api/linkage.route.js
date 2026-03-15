import { Router } from 'express';

const router = Router();

function getAccessToken(req) {
    const headerToken = req.headers?.token;
    const authHeader = req.headers?.authorization || req.headers?.Authorization;

    if (headerToken && String(headerToken).trim()) {
        return String(headerToken).trim();
    }

    if (authHeader && /^Bearer\s+/i.test(String(authHeader))) {
        return String(authHeader).replace(/^Bearer\s+/i, '').trim();
    }

    return '';
}

router.post('/login/smc', async (req, res, next) => {
    let response;
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
        response = await fetch(`${process.env.LINKAGE_API_BASE_URL}/api/center/login/`, request);
        const data = await response.json();
        if (!response.ok) {
            return res.status(response.status).json({ errorNumber: data.errorNumber, errorMessage: data.errorMessage, data: null });
        } else {
            return res.status(response.status).json({ errorNumber: 0, errorMessage: null, data });
        }
    } catch (error) {
        console.log('Logout Error:', error);
        return res.status(response?.status || 500).json({ errorNumber: 9999, errorMessage: "พบปัญหากรุณาติดต่อผู้ดูแลระบบ", data: null });
    }
});

router.post('/login/smc/auth', async (req, res, next) => {
    let response;
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
        response = await fetch(`${process.env.LINKAGE_API_BASE_URL}/api/center/login/confirm`, request);
        const data = await response.json();
        if (!response.ok) {
            return res.status(response.status).json({ errorNumber: data.errorNumber, errorMessage: data.errorMessage, data: null });
        } else {
            return res.status(response.status).json({ errorNumber: 0, errorMessage: null, data });
        }
    } catch (error) {
        console.log('Logout Error:', error);
        return res.status(response?.status || 500).json({ errorNumber: 9999, errorMessage: "พบปัญหากรุณาติดต่อผู้ดูแลระบบ", data: null });
    }
});

router.post('/login/thaid/auth', async (req, res, next) => {
    let response;
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
        response = await fetch(`${process.env.LINKAGE_API_BASE_URL}/api/center/login/confirm`, request);
        const data = await response.json();
        if (!response.ok) {
            return res.status(response.status).json({ errorNumber: data.errorNumber, errorMessage: data.errorMessage, data: null });
        } else {
            return res.status(response.status).json({ errorNumber: 0, errorMessage: null, data });
        }
    } catch (error) {
        console.log('Logout Error:', error);
        return res.status(response?.status || 500).json({ errorNumber: 9999, errorMessage: "พบปัญหากรุณาติดต่อผู้ดูแลระบบ", data: null });
    }
});

router.post('/user', async (req, res, next) => {
    let response;
    try {
        const token = getAccessToken(req);
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
        response = await fetch(`${process.env.LINKAGE_API_BASE_URL}/api/center/user/job`, request);
        const data = await response.json();
        if (!response.ok) {
            return res.status(response.status).json({ errorNumber: data.errorNumber, errorMessage: data.errorMessage, data: null });
        } else {
            return res.status(response.status).json({ errorNumber: 0, errorMessage: null, data });
        }
    } catch (error) {
        console.log('Logout Error:', error);
        return res.status(response?.status || 500).json({ errorNumber: 9999, errorMessage: "พบปัญหากรุณาติดต่อผู้ดูแลระบบ", data: null });
    }
});

router.post('/search', async (req, res, next) => {    
    let response;
    try {
        const token = getAccessToken(req);
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
        response = await fetch(`${process.env.LINKAGE_API_BASE_URL}/api/center/request/`, request);
        const data = await response.json();
        if (!response.ok) {
            return res.status(response.status).json({ errorNumber: data.errorNumber, errorMessage: data.errorMessage, data: null });
        } else {
            return res.status(response.status).json({ errorNumber: 0, errorMessage: null, data });
        }
    } catch (error) {
        console.log('Logout Error:', error);
        return res.status(response?.status || 500).json({ errorNumber: 9999, errorMessage: "พบปัญหากรุณาติดต่อผู้ดูแลระบบ", data: null });
    }
});

router.post('/renew', async (req, res, next) => {
    let response;
    try {
        const token = getAccessToken(req);
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
        response = await fetch(`${process.env.LINKAGE_API_BASE_URL}/api/center/login/renew`, request);
        const data = await response.json();
        if (!response.ok) {
            return res.status(response.status).json({ errorNumber: data.errorNumber, errorMessage: data.errorMessage, data: null });
        } else {
            return res.status(response.status).json({ errorNumber: 0, errorMessage: null, data });
        }
    } catch (error) {
        console.log('Logout Error:', error);
        return res.status(response?.status || 500).json({ errorNumber: 9999, errorMessage: "พบปัญหากรุณาติดต่อผู้ดูแลระบบ", data: null });
    }
});

router.post('/logout', async (req, res, next) => {
    let response;
    try {
        const token = getAccessToken(req);
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
        response = await fetch(`${process.env.LINKAGE_API_BASE_URL}/api/center/login/`, request);
        if (response.status === 204) {
            let data = { success:true, message: 'Logout completed' };
            return res.status(response.status).json({ errorNumber: 0, errorMessage: null, data });
        } else {
            return res.status(response.status).json({ errorNumber: data.errorNumber, errorMessage: data.errorMessage, data: null });
        }
    } catch (error) {
        console.log('Logout Error:', error);
        return res.status(response?.status || 500).json({ errorNumber: 9999, errorMessage: "พบปัญหากรุณาติดต่อผู้ดูแลระบบ", data: null });
    }
});

export default router;
