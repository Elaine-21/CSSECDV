// server/middleware/roles.js
const logger = require('./logger');

// Detect if the client likely expects JSON (API/XHR) vs HTML
function wantsJSON(req) {
  const accept = req.get('accept') || '';
  return req.xhr || accept.includes('application/json') || req.originalUrl.startsWith('/api');
}

function requireAuth(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) return next();

  // Audit log: unauthenticated access
  logger.warn({
    evt: 'AUTHZ_DENIED',
    reason: 'unauthenticated',
    method: req.method,
    path: req.originalUrl,
    ip: req.ip,
    ua: req.headers['user-agent'],
  });

  if (wantsJSON(req)) return res.status(401).json({ error: 'Unauthorized' });
  return res.status(401).render('errors/401', { message: 'Unauthorized' });
}

// Accepts a single role string or an array of roles
function requireRole(role) {
  const roles = Array.isArray(role) ? role : [role];

  return (req, res, next) => {
    const userType = req.user?.userType;
    if (userType && roles.includes(userType)) return next();

    // Audit log: insufficient role
    logger.warn({
      evt: 'AUTHZ_DENIED',
      reason: 'insufficient_role',
      requiredRole: roles,
      haveRole: userType,
      userId: req.user?._id,
      method: req.method,
      path: req.originalUrl,
      ip: req.ip,
      ua: req.headers['user-agent'],
    });

    if (wantsJSON(req)) return res.status(403).json({ error: 'Forbidden' });
    return res.status(403).render('errors/403', { message: 'Forbidden' });
  };
}

module.exports = { requireAuth, requireRole };
