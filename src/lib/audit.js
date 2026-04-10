function truncateString(value, max = 5000) {
  const text = String(value ?? '');
  return text.length > max ? `${text.slice(0, max)}...[truncated]` : text;
}

function normalizeBigInt(value) {
  if (typeof value === 'bigint') return value.toString();
  if (Array.isArray(value)) return value.map(normalizeBigInt);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, normalizeBigInt(v)]));
  }
  return value;
}

const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'token',
  'access_token',
  'accesstoken',
  'authorization',
  'cookie',
  'set-cookie',
  'xrandom',
  'xenvelop',
  'privatekey'
]);

function maskValue(value) {
  if (value == null) return value;
  const text = String(value);
  if (text.length <= 8) return '***';
  return `${text.slice(0, 4)}***${text.slice(-2)}`;
}

export function sanitizeForLog(value, depth = 0) {
  if (depth > 4) return '[max-depth]';
  if (value == null) return value;
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'string') return truncateString(value, 4000);
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.map((item) => sanitizeForLog(item, depth + 1));
  if (typeof value === 'object') {
    const out = {};
    for (const [key, item] of Object.entries(value)) {
      if (SENSITIVE_KEYS.has(String(key).toLowerCase())) {
        out[key] = maskValue(item);
      } else {
        out[key] = sanitizeForLog(item, depth + 1);
      }
    }
    return out;
  }
  return truncateString(value, 4000);
}

export function extractActor(req) {
  const user = req.session?.user || null;
  const userId = user?.id ? Number(user.id) : null;
  return {
    userId: Number.isFinite(userId) ? userId : null,
    userName: user?.name || null,
    userRole: user?.role || null,
    ipAddress: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || req.socket?.remoteAddress || '',
  };
}

export async function recordUserAction(req, action, details = '', meta = {}) {
  try {
    const actor = extractActor(req);
    if (!actor.userId) return;

    const metaText = Object.keys(meta).length > 0
      ? ` | meta=${JSON.stringify(sanitizeForLog(normalizeBigInt(meta)))}`
      : '';

    await req.prisma.userlog.create({
      data: {
        userid: BigInt(actor.userId),
        action: truncateString(action, 1000),
        details: truncateString(`${details}${metaText}`, 8000),
      }
    });
  } catch (error) {
    console.error('recordUserAction error:', error);
  }
}
