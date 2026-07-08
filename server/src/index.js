const express = require('express');
const cors = require('cors');
const session = require('express-session');
const path = require('path');

const config = require('./config/env');
const { initSchema } = require('./db/init');
const { UPLOADS_ROOT } = require('./middleware/upload');

const studentRoutes = require('./routes/studentRoutes');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const staffRoutes = require('./routes/staffRoutes');
const linkRoutes = require('./routes/linkRoutes');

initSchema();

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(
  session({
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 8 * 60 * 60 * 1000 }, // 8 hours
  })
);

app.use('/uploads', express.static(UPLOADS_ROOT));

app.use('/api', studentRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/link', linkRoutes);

app.get('/api/health', (req, res) => res.json({ ok: true }));

// Serve the built React app (npm run build in client/) on the same port as the
// API, so the whole system is reachable via one address/port on the LAN.
const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
app.use(express.static(clientDist));
app.get(/^(?!\/api|\/uploads).*/, (req, res, next) => {
  res.sendFile(path.join(clientDist, 'index.html'), (err) => {
    if (err) next();
  });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[server] Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(config.port, '0.0.0.0', () => {
  console.log(`\nPrintHub server listening on http://0.0.0.0:${config.port}`);
  console.log(`Reachable on this machine at http://localhost:${config.port}`);
  console.log('Find your LAN IP (ipconfig / ifconfig) so other devices can reach it on the same network.\n');
});
