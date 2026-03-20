import { Router } from 'express';
import { ensureAuth } from '../../middlewares/auth.js';
import { buildPrintedAt, fetchWorkModel } from './_work-helper.js';

const router = Router();
const mainView = 'job';
const subView = 'work8';
const viewtitle = 'งานคดีพินัย';
const viewPath = `${mainView}/${subView}`;
const jobwork = process.env.JOB_WORK8 || 'aaaa-bbbb-cccc-dddd';

router.get('/', ensureAuth, async (req, res, next) => {
  try {
    res.render(viewPath, {
      title: viewtitle,
      model: null,
      routeBase: `/job/${subView}`
    });
  } catch (err) {
    next(err);
  }
});

router.post('/', ensureAuth, async (req, res, next) => {
  try {
    const model = await fetchWorkModel(req, jobwork, req.body.pid || '');
    res.render(viewPath, {
      title: viewtitle,
      model,
      routeBase: `/job/${subView}`
    });
  } catch (err) {
    next(err);
  }
});

router.get('/print', ensureAuth, async (req, res, next) => {
  try {
    const pid = String(req.query.pid || '').trim();
    if (!pid) {
      return res.redirect(`/job/${subView}`);
    }

    const model = await fetchWorkModel(req, jobwork, pid);
    if (!model || model.error) {
      return res.render(viewPath, {
        title: viewtitle,
        model: model || { error: 'ไม่พบข้อมูลสำหรับพิมพ์', personalID: pid },
        routeBase: `/job/${subView}`
      });
    }

    res.render('job/print', {
      layout: 'layouts/blank',
      title: `พิมพ์ข้อมูล - ${viewtitle}`,
      pageTitle: 'ข้อมูลบุคคล (Linkage)',
      subtitle: viewtitle,
      model,
      printedAt: buildPrintedAt(),
      routeBase: `/job/${subView}`
    });
  } catch (err) {
    next(err);
  }
});

export default router;
