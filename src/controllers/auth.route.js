import { Router } from 'express';
import { ensureGuest } from '../middlewares/auth.js';
import bcrypt from 'bcryptjs';

const router = Router();

router.get('/login', ensureGuest, (req, res) => {
    let error = req.query?.error || null;
    res.render('auth/login', { title: 'Login', error: error, layout: false });
});

router.post('/login', ensureGuest, async (req, res, next) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).render('auth/login', {
                title: 'Login',
                error: 'กรุณากรอกอีเมลและรหัสผ่าน',
                layout: false
            });
        }

        const user = await req.prisma.user.findUnique({ where: { username } });
        if (!user) {
            return res.status(401).render('auth/login', {
                title: 'Login',
                error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
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

        req.session.user = {
            id: user.pid,
            name: user.name,
            email: user.email,
            role: user.role
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

        let rs = await fetch(`http://localhost:3000/linkage/api/login/thaid/auth`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pid: Number(pid), name, accessToken: access_token })
        });
        if (!rs.ok) {
            console.log('THAID LOGIN API ERROR:', rs.status, await rs.text());
            return res.status(401).render('auth/login', {
                title: 'Login',
                error: 'การตรวจสอบล้มเหลว',
                layout: false
            });
        }

        let itoken = await rs.json();
        console.log('THAID LOGIN API SUCCESS:', itoken);
        if (itoken?.data?.token) {
            let user = await req.prisma.user.upsert({
                where: { pid: Number(pid) },
                update: { name, token: itoken.data.token },
                create: { pid: Number(pid), name, email: 'admin@console.com', username: 'preuser', token: itoken.data.token, role: 'user', passwordHash: '' }
            });
            req.prisma.disconnect();
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
        res.redirect('https://web-app.bora.dopa.go.th/thaid3/auth?state=thaidlogin');
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
