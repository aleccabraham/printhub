function requireAdmin(req, res, next) {
  if (req.session.user && req.session.user.role === 'admin') return next();
  return res.status(401).json({ error: 'Admin login required' });
}

function requireStaff(req, res, next) {
  if (req.session.user && (req.session.user.role === 'staff' || req.session.user.role === 'admin')) return next();
  return res.status(401).json({ error: 'Staff login required' });
}

module.exports = { requireAdmin, requireStaff };
