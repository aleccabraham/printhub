const express = require('express');
const db = require('../db/db');

const router = express.Router();

// Passwords are checked as plaintext for now.
// TODO: replace with bcrypt hashing before any real deployment.
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password are required' });

  const admin = db.prepare('SELECT * FROM admin_accounts WHERE email = ?').get(email);
  if (admin && admin.password === password) {
    req.session.user = { id: admin.id, email: admin.email, name: admin.name, role: 'admin' };
    return res.json({ user: req.session.user });
  }

  const staff = db.prepare('SELECT * FROM staff_accounts WHERE email = ?').get(email);
  if (staff && staff.password === password) {
    req.session.user = { id: staff.id, email: staff.email, name: staff.name, role: 'staff' };
    return res.json({ user: req.session.user });
  }

  res.status(401).json({ error: 'Invalid email or password' });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

router.get('/me', (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Not logged in' });
  res.json({ user: req.session.user });
});

module.exports = router;
