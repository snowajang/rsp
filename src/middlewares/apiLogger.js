import { extractActor, sanitizeForLog } from '../lib/audit.js';

function shouldSkipLog(req) {
  const path = req.path || '';
  if (path.startsWith('/css/') || path.startsWith('/js/') || path.startsWith('/images/')) return true;
  if (path === '/favicon.ico') return true;
  return false;
}

export function apiLogger(req, res, next) {
  if (shouldSkipLog(req)) return next();

  const startedAt = Date.now();
  const actor = extractActor(req);
  let responseBody;

  const originalJson = res.json.bind(res);
  const originalSend = res.send.bind(res);

  res.json = function patchedJson(body) {
    responseBody = body;
    return originalJson(body);
  };

  res.send = function patchedSend(body) {
    if (responseBody === undefined) responseBody = body;
    return originalSend(body);
  };

  res.on('finish', async () => {
    try {
      const durationMs = Date.now() - startedAt;
      const reqHeaders = sanitizeForLog(req.headers || {});
      const reqBody = sanitizeForLog(req.body || {});
      const resBody = sanitizeForLog(responseBody);
      const details = [
        req.path.startsWith('/api') ? 'api-request' : 'web-request',
        `durationMs=${durationMs}`,
        actor.userName ? `actor=${actor.userName}` : null,
        actor.userRole ? `role=${actor.userRole}` : null,
      ].filter(Boolean).join(' | ');

      await req.prisma.applog.create({
        data: {
          userid: actor.userId ? BigInt(actor.userId) : null,
          endpoint: req.originalUrl || req.url || '',
          method: req.method || '',
          ipaddress: actor.ipAddress || '',
          reqHeader: reqHeaders,
          reqBody,
          resStatus: res.statusCode,
          resBody,
          details,
          status: res.statusCode >= 400 ? 0 : 1,
        }
      });
    } catch (error) {
      console.error('apiLogger error:', error);
    }
  });

  next();
}
