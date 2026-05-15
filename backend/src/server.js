require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// ── Seguridad ─────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(compression());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ── CORS ──────────────────────────────────────────────────────────
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000').split(',');
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('CORS no permitido para: ' + origin));
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Archivos estáticos ────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ── Rate limiting ─────────────────────────────────────────────────
const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300, message: { error: 'Demasiadas peticiones, intenta más tarde' } });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { error: 'Demasiados intentos de login' } });
const qrLimiter  = rateLimit({ windowMs: 1 * 60 * 1000, max: 60 }); // 60 escaneos/min

app.use('/api/', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/accesos/validar', qrLimiter);

// ── Rutas ─────────────────────────────────────────────────────────
app.use('/api/auth',            require('./routes/auth'));
app.use('/api/socios',          require('./routes/socios'));
app.use('/api/membresias',      require('./routes/membresias'));
app.use('/api/creditos',        require('./routes/creditos'));
app.use('/api/contratos',       require('./routes/contratos'));
app.use('/api/clases',          require('./routes/clases'));
app.use('/api/reservas',        require('./routes/reservas'));
app.use('/api/accesos',         require('./routes/accesos'));
app.use('/api/qr',              require('./routes/qr'));
app.use('/api/pagos',           require('./routes/pagos'));
app.use('/api/notificaciones',  require('./routes/notificaciones'));
app.use('/api/dashboard',       require('./routes/dashboard'));
app.use('/api/config',          require('./routes/config'));
app.use('/api/imc2',            require('./routes/imc2'));
app.use('/api/importar',        require('./routes/importar'));
app.use('/api/estadisticas',    require('./routes/estadisticas'));
app.use('/api/facturas',        require('./routes/facturas'));

// ── Health check ──────────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  const db = require('./config/db');
  try {
    await db.query('SELECT 1');
    res.json({ status: 'ok', version: '1.0.0', sistema: 'FLY NC Gym Management', db: 'conectada', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({ status: 'error', db: 'no conectada', error: err.message });
  }
});

// ── 404 ───────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.path}` });
});

// ── Error handler ─────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ── Arranque ──────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🔥 FLY NC API corriendo en puerto ${PORT}`);
  console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 Health: http://localhost:${PORT}/api/health\n`);
});

// ── Cron jobs ─────────────────────────────────────────────────────
require('./services/cron');

module.exports = app;
