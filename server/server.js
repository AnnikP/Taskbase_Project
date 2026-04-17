require('dotenv').config();

const express      = require('express');
const mongoose     = require('mongoose');
const session      = require('express-session');
const MongoStore   = require('connect-mongo');
const path         = require('path');

const authRoutes  = require('./routes/auth');
const userRoutes  = require('./routes/user');
const listRoutes  = require('./routes/lists');
const taskRoutes  = require('./routes/tasks');

const app  = express();
const PORT = 3000;

const MONGODB_URI    = 'mongodb://127.0.0.1:27017/Group-10-HW7';
const SESSION_SECRET = 'taskbase-local-secret';

// ─── Connect to MongoDB ────────────────────────────────────────────────────────
mongoose
  .connect(MONGODB_URI)
  .then(() => console.log('✅  MongoDB connected:', MONGODB_URI))
  .catch(err => { console.error('❌  MongoDB connection error:', err); process.exit(1); });

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session store backed by MongoDB so sessions survive restarts
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: MONGODB_URI }),
  cookie: {
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000   // 7 days
  }
}));

// Serve static files from client/ directory
app.use(express.static(path.join(__dirname, '..', 'client')));

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth',  authRoutes);
app.use('/api/user',  userRoutes);
app.use('/api/lists', listRoutes);
app.use('/api/tasks', taskRoutes);

// ─── Page Routes ──────────────────────────────────────────────────────────────
// Dashboard — requires login, redirect otherwise
app.get('/dashboard', (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.redirect('/');
  }
  res.sendFile(path.join(__dirname, '..', 'client', 'pages', 'dashboard.html'));
});

// Root → index (landing/demo) page; skip it if already logged in
app.get('/', (req, res) => {
  if (req.session && req.session.userId) {
    return res.redirect('/dashboard');
  }
  res.sendFile(path.join(__dirname, '..', 'client', 'pages', 'index.html'));
});

// ─── 404 fallback ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀  Taskbase running → http://localhost:${PORT}`);
});