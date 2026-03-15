import { Router } from 'express';
import { ensureAuth } from '../../middlewares/auth.js';
import * as tools from '../../middlewares/tools.js';

const router = Router();
const mainView = 'job';
const subView = 'work1';
const viewtitle = 'ข้อมูลปรับพินัย';
const viewPath = `${mainView}/${subView}`;
const jobwork = process.env.JOB_WORK1 || 'aaaa-bbbb-cccc-dddd';

router.get("/", ensureAuth, async (req, res, next) => {
    try {
        res.render(viewPath, {
            title: viewtitle,
            model: null
        });
    } catch (err) {
        next(err);
    }
});
router.post("/", ensureAuth, async (req, res, next) => {
    try {
        let jobcode = {
            "jobID": jobwork,
            "data": [
                {
                    "serviceID": 1,
                    "query": {
                        "personalID": req.body.pid || ""
                    }
                },
                {
                    "serviceID": 38,
                    "query": {
                        "personalID": req.body.pid || ""
                    }
                }
            ]
        }
        let rs = await fetch("http://localhost:3000/api/linkage/search", {
            method: 'POST',
            headers: { 
                'Connection': 'close',
                'Content-Type': 'application/json',
                'token': req.session?.user?.lk || ''
            },
            body: JSON.stringify(jobcode)
        });
        let model = null;
        if (!rs.ok) {
            console.log('JOB API ERROR:', rs.status);
            let errorText = 'เกิดข้อผิดพลาดในการเรียก API';
            try {
                let errorData = await rs.json();
                if (errorData?.errorNumber) {   
                    errorText = `เกิดข้อผิดพลาดในการเรียก LINKAGE Error ${errorData.errorNumber}: ${errorData.errorMessage}`;
                } else {
                    errorText = errorData?.message || errorText;
                }
            } catch (e) {
                // ไม่สามารถแปลงเป็น JSON ได้
                console.log('Error reading error response:', e);
                try {
                    let errorTextRaw = await rs.text();
                    errorText = errorTextRaw || errorText;  
                } catch (e2) {
                    // ไม่สามารถอ่านข้อความได้
                    console.log('Error reading error response:', e2);
                    errorText = `เกิดข้อผิดพลาดในการเรียก API (status: ${rs.status})`;
                }
            }
            model = { error: errorText };
        } else {
            let data = await rs.json();
            // console.log('API Response Data:', data);
            model = tools.genModelFirst(data?.data || [], data?.executeTimeMs || null);
            model.personalID = req.body.pid || "";
        }
        res.render(viewPath, {
            title: viewtitle,
            model
        });
    } catch (err) {
        next(err);
    }
});

export default router;