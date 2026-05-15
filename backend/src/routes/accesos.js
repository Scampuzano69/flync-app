const router = require('express').Router();
const db = require('../config/db');
const { auth, esAdmin } = require('../middleware/auth');
const crypto = require('crypto');

// POST /api/accesos/validar — endpoint para el hardware iMC²
// Recibe el QR escaneado y decide si abre o no
router.post('/validar', async (req, res) => {
  const t0 = Date.now();
  try {
    const { token, device_id, device_name, tipo = 'entrada' } = req.body;
    if (!token) return res.status(400).json({ acceso: false, resultado: 'error', mensaje: 'Token requerido' });

    let usuarioId = null;
    let usuario = null;

    // 1. Intentar QR dinámico (token rotante c/90s)
    const { rows: qrRows } = await db.query(
      `SELECT qt.*, u.id AS uid, u.nombre, u.apellidos, u.activo
       FROM qr_tokens qt JOIN usuarios u ON u.id = qt.usuario_id
       WHERE qt.token = $1 AND qt.expira_en > NOW() AND qt.usado = FALSE`,
      [token]
    );

    if (qrRows.length) {
      // Token dinámico válido
      await db.query('UPDATE qr_tokens SET usado = TRUE WHERE id = $1', [qrRows[0].id]);
      usuarioId = qrRows[0].uid;
      usuario = qrRows[0];
    } else {
      // 2. Intentar QR estático (payload JSON con uid)
      try {
        const payload = JSON.parse(token);
        if (payload.uid) {
          const { rows: uRows } = await db.query('SELECT id AS uid, nombre, apellidos, activo FROM usuarios WHERE id = $1', [payload.uid]);
          if (uRows.length) { usuarioId = uRows[0].uid; usuario = uRows[0]; }
        }
      } catch {}
    }

    if (!usuarioId) {
      await db.query(
        `INSERT INTO accesos (tipo, metodo, resultado, motivo_denegacion, qr_token, dispositivo_id, dispositivo_nombre)
         VALUES ($1,'qr','no_encontrado','QR no reconocido',$2,$3,$4)`,
        [tipo, token.substring(0, 100), device_id, device_name || 'Terminal']
      );
      return res.json({ acceso: false, resultado: 'denegado', codigo: 'QR_INVALIDO', mensaje: 'QR no reconocido o expirado', ms: Date.now() - t0 });
    }

    // 3. Verificar usuario activo
    if (!usuario.activo) {
      await db.query(
        `INSERT INTO accesos (usuario_id, tipo, metodo, resultado, motivo_denegacion, dispositivo_id, dispositivo_nombre)
         VALUES ($1,$2,'qr','inactivo','Usuario inactivo',$3,$4)`,
        [usuarioId, tipo, device_id, device_name || 'Terminal']
      );
      return res.json({ acceso: false, resultado: 'denegado', codigo: 'USUARIO_INACTIVO', mensaje: 'Socio no activo. Contacta con recepción.', ms: Date.now() - t0 });
    }

    // 4. Buscar crédito "Entrada" disponible
    const { rows: credRows } = await db.query(
      `SELECT cu.* FROM creditos_usuario cu
       JOIN tipos_credito tc ON tc.id = cu.tipo_credito_id
       WHERE cu.usuario_id = $1 AND tc.nombre = 'Entrada'
         AND cu.cantidad_disponible > 0 AND cu.activo = TRUE
         AND (cu.fecha_caducidad IS NULL OR cu.fecha_caducidad > NOW())
       ORDER BY cu.fecha_caducidad ASC NULLS LAST LIMIT 1`,
      [usuarioId]
    );

    // 5. Verificar contrato activo como alternativa
    const { rows: contratos } = await db.query(
      `SELECT id FROM contratos WHERE usuario_id = $1 AND estado = 'activo' AND (fecha_fin IS NULL OR fecha_fin > NOW()) LIMIT 1`,
      [usuarioId]
    );

    const tieneAcceso = credRows.length > 0 || contratos.length > 0;

    if (!tieneAcceso) {
      await db.query(
        `INSERT INTO accesos (usuario_id, tipo, metodo, resultado, motivo_denegacion, dispositivo_id, dispositivo_nombre)
         VALUES ($1,$2,'qr','sin_creditos','Sin créditos de Entrada y sin contrato activo',$3,$4)`,
        [usuarioId, tipo, device_id, device_name || 'Terminal']
      );
      return res.json({
        acceso: false, resultado: 'denegado', codigo: 'SIN_CREDITOS',
        mensaje: `${usuario.nombre} — Sin créditos disponibles. Renueva tu plan.`,
        socio: `${usuario.nombre} ${usuario.apellidos || ''}`,
        ms: Date.now() - t0
      });
    }

    // 6. Consumir crédito si existe
    let creditoUsadoId = null;
    let creditosTipo = null;

    if (credRows.length) {
      await db.query('UPDATE creditos_usuario SET cantidad_usada = cantidad_usada + 1 WHERE id = $1', [credRows[0].id]);
      creditoUsadoId = credRows[0].id;
      const { rows: tcRows } = await db.query('SELECT id FROM tipos_credito WHERE nombre = $1', ['Entrada']);
      creditosTipo = tcRows[0]?.id;
    }

    // 7. Registrar acceso exitoso
    await db.query(
      `INSERT INTO accesos (usuario_id, tipo, metodo, credito_consumido_id, tipo_credito_id, resultado, qr_token, dispositivo_id, dispositivo_nombre)
       VALUES ($1,$2,'qr',$3,$4,'ok',$5,$6,$7)`,
      [usuarioId, tipo, creditoUsadoId, creditosTipo, token.substring(0, 100), device_id, device_name || 'Terminal']
    );

    // 8. Actualizar estadísticas del socio
    await db.query(
      `UPDATE usuarios SET ultima_visita = NOW(), total_visitas = total_visitas + 1 WHERE id = $1`,
      [usuarioId]
    );

    const creditosRestantes = credRows.length ? credRows[0].cantidad_disponible - 1 : null;

    return res.json({
      acceso: true, resultado: 'ok', codigo: 'ACCESO_OK',
      mensaje: `Bienvenido, ${usuario.nombre}`,
      socio: `${usuario.nombre} ${usuario.apellidos || ''}`,
      usuario_id: usuarioId,
      creditos_restantes: creditosRestantes,
      ms: Date.now() - t0
    });

  } catch (err) {
    console.error('Error validando acceso:', err.message);
    res.status(500).json({ acceso: false, resultado: 'error', mensaje: 'Error interno', ms: Date.now() - t0 });
  }
});

// GET /api/accesos — historial de accesos (admin)
router.get('/', auth, esAdmin, async (req, res) => {
  try {
    const { fecha, usuario_id, resultado, limite = 100, pagina = 1 } = req.query;
    let where = ['1=1']; const params = []; let i = 1;
    if (fecha) { where.push(`DATE(a.timestamp AT TIME ZONE 'Europe/Madrid') = $${i}`); params.push(fecha); i++; }
    if (usuario_id) { where.push(`a.usuario_id = $${i}`); params.push(usuario_id); i++; }
    if (resultado) { where.push(`a.resultado = $${i}`); params.push(resultado); i++; }
    const lim = Math.min(500, parseInt(limite));
    const off = (Math.max(1, parseInt(pagina)) - 1) * lim;
    params.push(lim, off);

    const { rows } = await db.query(
      `SELECT a.*, COALESCE(u.nombre || ' ' || u.apellidos, 'Desconocido') AS socio_nombre, u.avatar_url, tc.nombre AS credito_tipo
       FROM accesos a LEFT JOIN usuarios u ON u.id = a.usuario_id LEFT JOIN tipos_credito tc ON tc.id = a.tipo_credito_id
       WHERE ${where.join(' AND ')} ORDER BY a.timestamp DESC LIMIT $${i} OFFSET $${i+1}`, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/accesos/hoy — resumen del día
router.get('/hoy', auth, esAdmin, async (req, res) => {
  try {
    const [accesos, stats] = await Promise.all([
      db.query(`SELECT a.*, COALESCE(u.nombre || ' ' || u.apellidos, 'Desconocido') AS socio_nombre, tc.nombre AS credito_tipo
                FROM accesos a LEFT JOIN usuarios u ON u.id = a.usuario_id LEFT JOIN tipos_credito tc ON tc.id = a.tipo_credito_id
                WHERE DATE(a.timestamp AT TIME ZONE 'Europe/Madrid') = CURRENT_DATE ORDER BY a.timestamp DESC LIMIT 200`),
      db.query(`SELECT
                  COUNT(*) FILTER (WHERE resultado = 'ok') AS entradas_ok,
                  COUNT(*) FILTER (WHERE resultado != 'ok') AS denegados,
                  COUNT(*) FILTER (WHERE resultado = 'sin_creditos') AS sin_creditos,
                  COUNT(DISTINCT usuario_id) FILTER (WHERE resultado = 'ok') AS socios_unicos,
                  COUNT(*) FILTER (WHERE resultado = 'ok' AND EXTRACT(HOUR FROM timestamp) < 12) AS entradas_manana,
                  COUNT(*) FILTER (WHERE resultado = 'ok' AND EXTRACT(HOUR FROM timestamp) >= 12) AS entradas_tarde
                FROM accesos WHERE DATE(timestamp AT TIME ZONE 'Europe/Madrid') = CURRENT_DATE`)
    ]);
    res.json({ accesos: accesos.rows, stats: stats.rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/accesos/manual — registrar acceso manual (sin QR)
router.post('/manual', auth, esAdmin, async (req, res) => {
  try {
    const { usuario_id, tipo = 'entrada', motivo = 'Acceso manual por staff' } = req.body;
    if (!usuario_id) return res.status(400).json({ error: 'usuario_id requerido' });

    // Verificar usuario
    const { rows: uRows } = await db.query('SELECT id, nombre, apellidos, activo FROM usuarios WHERE id = $1', [usuario_id]);
    if (!uRows.length) return res.status(404).json({ error: 'Usuario no encontrado' });

    await db.query(
      `INSERT INTO accesos (usuario_id, tipo, metodo, resultado, motivo_denegacion, dispositivo_nombre)
       VALUES ($1,$2,'manual','ok',$3,'Panel Admin')`,
      [usuario_id, tipo, motivo]
    );
    await db.query('UPDATE usuarios SET ultima_visita = NOW(), total_visitas = total_visitas + 1 WHERE id = $1', [usuario_id]);
    res.json({ ok: true, mensaje: `Acceso manual registrado para ${uRows[0].nombre}` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
