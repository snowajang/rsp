import { Router } from 'express';
import { ensureGuest } from '../middlewares/auth.js';
import bcrypt from 'bcryptjs';

const router = Router();

router.get('/login', ensureGuest, (req, res) => {
    const error = req.query?.error || null;
    res.render('auth/login', { title: 'Login', error, layout: false });
});

router.post('/login', ensureGuest, async (req, res, next) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).render('auth/login', {
                title: 'Login',
                error: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน',
                layout: false
            });
        }

        const user = await req.prisma.member.findUnique({ where: { username } });
        if (!user) {
            return res.status(401).render('auth/login', {
                title: 'Login',
                error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
                layout: false
            }); 
        }

        if (!user.isActive) {
            return res.status(403).render('auth/login', {
                title: 'Login',
                error: 'บัญชีผู้ใช้นี้ถูกระงับการใช้งาน',
                layout: false
            });
        }
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) {
            return res.status(401).render('auth/login', {
                title: 'Login',
                error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
                layout: false
            });
        }

        await req.prisma.member.update({
            where: { pid: user.pid },
            data: { lastLogin: new Date() }
        });
        
        req.session.user = {
            id: user.pid.toString(),
            name: user.name,
            email: user.email,
            role: user.role,
            isActive: user.isActive
        };

        res.redirect('/');
    } catch (err) {
        console.log(err);
        next(err);
    }
});

router.post('/thaid', ensureGuest, async (req, res, next) => {
    try {
        let { access_token, pid, name } = req.body;
          
        if (!access_token || !pid || !name) {
            console.log('THAID LOGIN PAYLOAD body:', access_token, pid, name);

            return res.status(400).render('auth/login', {
                title: 'Login',
                error: 'ข้อมูลไม่ครบถ้วน',
                layout: false
            });
        }

        let rs = await fetch(`http://localhost:3000/api/linkage/login/thaid/auth`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pid: Number(pid), name, accessToken: access_token })
        });
        if (!rs.ok) {
            console.log('THAID LOGIN API ERROR:', rs.status);
            let data = await rs.json();
            return res.status(401).render('auth/login', {
                title: 'Login',
                error: data.errorMessage || 'การตรวจสอบล้มเหลว',
                layout: false
            });
        }

        let itoken = await rs.json();
        console.log('THAID LOGIN API SUCCESS:', itoken);
        if (itoken?.data?.token) {
            const pidNumber = Number(pid);

            let user = await req.prisma.member.findUnique({
                where: { pid: pidNumber }
            });

            if (!user) {
                user = await req.prisma.member.create({
                    data: {
                        pid: pidNumber,
                        name,
                        email: 'admin@console.com',
                        username: 'preuser',
                        token: itoken.data.token,
                        role: 'user',
                        passwordHash: ''
                    }
                });
            } else {
                user = await req.prisma.member.update({
                    where: { pid: pidNumber },
                    data: {
                        name,
                        token: itoken.data.token
                    }
                });
            }
            
            rs = await fetch(`http://localhost:3000/api/linkage/user`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${itoken.data.token}` }
            });
            let job = null;
            if (!rs.ok) {
                console.log('THAID LOGIN USER API ERROR:', rs.status, await rs.text());
                job = {};
            } else {
                let userinfo = await rs.json();
                console.log('THAID LOGIN USER API SUCCESS:', userinfo);
                job = userinfo?.data?.job || {};
            }
            req.session.user = {
                id: pid,
                name: name,
                lk: itoken.data.token,
                role: user.role
            };
            res.redirect('/');
        } else {
            res.render('auth/login', { title: 'Login', error: `${pid} ${name}`, layout: false });
        }
    } catch (err) {
        next(err);
    }
});

router.post('/thaidlogin', ensureGuest, async (req, res, next) => {
    try {
        // res.redirect('https://web-app.bora.dopa.go.th/thaid3/auth?state=thaidlogin');
        res.redirect('/vthaid/auth?state=webapp');
    } catch (err) {
        next(err);
    }
});

router.post('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/auth/login');
    });
});

export default router;
