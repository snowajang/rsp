export function ensureAuth(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  return res.redirect('/auth/login');
}

export function ensureGuest(req, res, next) {
  if (req.session && req.session.user) {
    return res.redirect('/');
  } 
  return next();
}

