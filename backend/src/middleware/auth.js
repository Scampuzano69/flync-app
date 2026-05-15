const jwt = require('jsonwebtoken');
const db = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'flync_jwt_super_secret_cambia_esto';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '7d';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'flync_refresh_secret';
const REFRESH_EXPIRES = process.env.REFRESH_EXPIRES || '30d';

// Generar tokens
const generarTokens = (usuario) => {
  const payload = { id: usuario.id, email: usuario.email, rol: usuario.rol };
  const access = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
  const refresh = jwt.sign({ id: usuario.id }, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES });
  return { access, refresh };
};

// Middleware: verificar JWT
const auth = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de acceso requerido' });
    }
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const { rows } = await db.query(
      'SELECT id, email, nombre, apellidos, rol, activo, avatar_url FROM usuarios WHERE id = $1',
      [decoded.id]
    );
    if (!rows.length) return res.status(401).json({ error: 'Usuario no encontrado' });
    if (!rows[0].activo) return res.status(403).json({ error: 'Cuenta desactivada' });
    req.user = rows[0];
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') return res.status(401).json({ error: 'Token expirado', code: 'TOKEN_EXPIRED' });
    if (err.name === 'JsonWebTokenError') return res.status(401).json({ error: 'Token inválido' });
    next(err);
  }
};

// Middleware: solo admin o staff
const esAdmin = (req, res, next) => {
  if (!['superadmin','admin','staff'].includes(req.user?.rol)) {
    return res.status(403).json({ error: 'Acceso denegado — se requiere rol administrador' });
  }
  next();
};

// Middleware: solo entrenadores+
const esEntrenador = (req, res, next) => {
  if (!['superadmin','admin','staff','entrenador'].includes(req.user?.rol)) {
    return res.status(403).json({ error: 'Acceso denegado — se requiere rol entrenador' });
  }
  next();
};

// Middleware: admin o el propio usuario
const esPropioOAdmin = (req, res, next) => {
  const esAdmin = ['superadmin','admin','staff'].includes(req.user?.rol);
  const esPropio = req.params.id === req.user?.id;
  if (!esAdmin && !esPropio) {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
  next();
};

// Middleware: token opcional (para endpoints públicos con info extra si hay sesión)
const authOpcional = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) return next();
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const { rows } = await db.query('SELECT id, email, nombre, rol, activo FROM usuarios WHERE id = $1', [decoded.id]);
    if (rows.length && rows[0].activo) req.user = rows[0];
  } catch {}
  next();
};

module.exports = { auth, esAdmin, esEntrenador, esPropioOAdmin, authOpcional, generarTokens, JWT_SECRET, REFRESH_SECRET };
