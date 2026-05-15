const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { auth, generarTokens, REFRESH_SECRET } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password, dispositivo } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email y contraseña requeridos' });
    const { rows } = await db.query('SELECT * FROM usuarios WHERE email = $1', [email.toLowerCase().trim()]);
    if (!rows.length) return res.status(401).json({ error: 'Credenciales incorrectas' });
    const u = rows[0];
    const ok = await bcrypt.compare(password, u.password_hash);
    if (!ok) return res.status(401).json({ error: 'Credenciales incorrectas' });
    if (!u.activo) return res.status(403).json({ error: 'Cuenta desactivada. Contacta con el gimnasio.' });
    const { access, refresh } = generarTokens(u);
    const exp = new Date(Date.now() + 30 * 24 * 3600000);
    await db.query('INSERT INTO refresh_tokens (usuario_id, token, dispositivo, ip, expira_en) VALUES ($1,$2,$3,$4,$5)',
      [u.id, refresh, dispositivo || 'web', req.ip, exp]);
    res.json({
      access_token: access, refresh_token: refresh, expires_in: 604800,
      usuario: { id: u.id, email: u.email, nombre: u.nombre, apellidos: u.apellidos, rol: u.rol, avatar_url: u.avatar_url }
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  try {
    const { refresh_token } = req.body;
    if (!refresh_token) return res.status(400).json({ error: 'Refresh token requerido' });
    const decoded = jwt.verify(refresh_token, REFRESH_SECRET);
    const { rows: rts } = await db.query(
      'SELECT * FROM refresh_tokens WHERE token = $1 AND revocado = FALSE AND expira_en > NOW()', [refresh_token]);
    if (!rts.length) return res.status(401).json({ error: 'Refresh token inválido o expirado' });
    const { rows: users } = await db.query('SELECT * FROM usuarios WHERE id = $1 AND activo = TRUE', [decoded.id]);
    if (!users.length) return res.status(401).json({ error: 'Usuario no encontrado' });
    await db.query('UPDATE refresh_tokens SET revocado = TRUE WHERE token = $1', [refresh_token]);
    const { access, refresh } = generarTokens(users[0]);
    const exp = new Date(Date.now() + 30 * 24 * 3600000);
    await db.query('INSERT INTO refresh_tokens (usuario_id, token, expira_en) VALUES ($1,$2,$3)', [users[0].id, refresh, exp]);
    res.json({ access_token: access, refresh_token: refresh });
  } catch { res.status(401).json({ error: 'Refresh token inválido' }); }
});

// POST /api/auth/logout
router.post('/logout', auth, async (req, res) => {
  try {
    const { refresh_token } = req.body;
    if (refresh_token) await db.query('UPDATE refresh_tokens SET revocado = TRUE WHERE token = $1', [refresh_token]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/auth/me
router.get('/me', auth, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT u.id, u.email, u.nombre, u.apellidos, u.rol, u.telefono, u.avatar_url, u.fecha_alta, u.total_visitas, u.ultima_visita, u.activo,
        (SELECT COUNT(*) FROM contratos WHERE usuario_id = u.id AND estado = 'activo') AS contratos_activos,
        (SELECT COALESCE(SUM(cantidad_disponible),0) FROM creditos_usuario WHERE usuario_id = u.id AND activo = TRUE AND (fecha_caducidad IS NULL OR fecha_caducidad > NOW())) AS creditos_totales,
        (SELECT json_agg(json_build_object('tipo',tc.nombre,'disponible',cu.cantidad_disponible,'color',tc.color,'id',cu.id))
         FROM creditos_usuario cu JOIN tipos_credito tc ON tc.id = cu.tipo_credito_id
         WHERE cu.usuario_id = u.id AND cu.activo = TRUE AND cu.cantidad_disponible > 0 AND (cu.fecha_caducidad IS NULL OR cu.fecha_caducidad > NOW())
        ) AS creditos_detalle
      FROM usuarios u WHERE u.id = $1`, [req.user.id]);
    if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/auth/cambiar-password
router.post('/cambiar-password', auth, async (req, res) => {
  try {
    const { password_actual, password_nuevo } = req.body;
    if (!password_actual || !password_nuevo) return res.status(400).json({ error: 'Ambas contraseñas son requeridas' });
    if (password_nuevo.length < 8) return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
    const { rows } = await db.query('SELECT password_hash FROM usuarios WHERE id = $1', [req.user.id]);
    const ok = await bcrypt.compare(password_actual, rows[0].password_hash);
    if (!ok) return res.status(401).json({ error: 'Contraseña actual incorrecta' });
    const hash = await bcrypt.hash(password_nuevo, 12);
    await db.query('UPDATE usuarios SET password_hash = $1 WHERE id = $2', [hash, req.user.id]);
    await db.query('UPDATE refresh_tokens SET revocado = TRUE WHERE usuario_id = $1', [req.user.id]);
    res.json({ ok: true, mensaje: 'Contraseña cambiada. Vuelve a iniciar sesión.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
