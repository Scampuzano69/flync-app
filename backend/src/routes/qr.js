const router = require('express').Router();
const db = require('../config/db');
const QRCode = require('qrcode');
const { auth } = require('../middleware/auth');
const crypto = require('crypto');

// GET /api/qr/generar — genera token QR dinámico (válido 90 segundos)
router.get('/generar', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Invalidar tokens anteriores del usuario
    await db.query('UPDATE qr_tokens SET usado = TRUE WHERE usuario_id = $1 AND expira_en > NOW() AND usado = FALSE', [userId]);

    // Generar nuevo token único
    const token = crypto.randomBytes(32).toString('hex');
    const expira = new Date(Date.now() + 90 * 1000); // 90 segundos

    await db.query('INSERT INTO qr_tokens (usuario_id, token, expira_en) VALUES ($1, $2, $3)', [userId, token, expira]);

    // Generar imagen QR
    const qrImage = await QRCode.toDataURL(token, {
      width: 300, margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
      errorCorrectionLevel: 'M'
    });

    res.json({
      qr_image: qrImage,
      token,
      expira_en: expira.toISOString(),
      segundos_valido: 90,
      usuario: { nombre: req.user.nombre, apellidos: req.user.apellidos }
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/qr/socio/:id — QR estático del socio para panel admin
router.get('/socio/:id', auth, async (req, res) => {
  try {
    const esAdmin = ['superadmin','admin','staff'].includes(req.user.rol);
    const esMio = req.params.id === req.user.id;
    if (!esAdmin && !esMio) return res.status(403).json({ error: 'Acceso denegado' });

    const { rows } = await db.query('SELECT id, nombre, apellidos FROM usuarios WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Socio no encontrado' });

    const socio = rows[0];

    // Generar token dinámico para este socio
    const token = crypto.randomBytes(32).toString('hex');
    const expira = new Date(Date.now() + 90 * 1000);
    await db.query('INSERT INTO qr_tokens (usuario_id, token, expira_en) VALUES ($1, $2, $3)', [socio.id, token, expira]);

    const qrImage = await QRCode.toDataURL(token, { width: 280, margin: 2 });

    res.json({
      qr_image: qrImage,
      socio: `${socio.nombre} ${socio.apellidos || ''}`,
      id: socio.id,
      expira_en: expira.toISOString()
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/qr/verificar — verificar un token QR (para tests)
router.post('/verificar', auth, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token requerido' });

    const { rows } = await db.query(
      `SELECT qt.*, u.nombre, u.apellidos FROM qr_tokens qt
       JOIN usuarios u ON u.id = qt.usuario_id
       WHERE qt.token = $1`, [token]);

    if (!rows.length) return res.json({ valido: false, motivo: 'Token no encontrado' });
    const qt = rows[0];
    if (qt.expira_en < new Date()) return res.json({ valido: false, motivo: 'Token expirado' });
    if (qt.usado) return res.json({ valido: false, motivo: 'Token ya usado' });

    res.json({ valido: true, socio: `${qt.nombre} ${qt.apellidos || ''}`, usuario_id: qt.usuario_id, expira_en: qt.expira_en });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
