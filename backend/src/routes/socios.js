const router = require('express').Router();
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { auth, esAdmin, esPropioOAdmin } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const crypto = require('crypto');

// GET /api/socios — listar socios con filtros y paginación
router.get('/', auth, esAdmin, async (req, res) => {
  try {
    const { buscar = '', estado = '', membresia_id = '', pagina = 1, limite = 20, orden = 'nombre' } = req.query;
    const pag = Math.max(1, parseInt(pagina));
    const lim = Math.min(100, Math.max(1, parseInt(limite)));
    const offset = (pag - 1) * lim;

    let where = ["u.rol = 'socio'"];
    const params = [];
    let i = 1;

    if (buscar) {
      where.push(`(u.nombre ILIKE $${i} OR u.apellidos ILIKE $${i} OR u.email ILIKE $${i} OR u.telefono ILIKE $${i} OR u.dni ILIKE $${i})`);
      params.push(`%${buscar}%`); i++;
    }
    if (estado === 'activo') { where.push('u.activo = TRUE AND c.estado = \'activo\''); }
    else if (estado === 'pausado') { where.push('c.estado = \'pausado\''); }
    else if (estado === 'baja') { where.push('u.activo = FALSE'); }
    if (membresia_id) { where.push(`c.membresia_id = $${i}`); params.push(parseInt(membresia_id)); i++; }

    const ordenMap = { nombre: 'u.nombre, u.apellidos', fecha_alta: 'u.fecha_alta DESC', visitas: 'u.total_visitas DESC', ultima_visita: 'u.ultima_visita DESC NULLS LAST' };
    const orderBy = ordenMap[orden] || 'u.nombre, u.apellidos';

    const sql = `
      SELECT u.id, u.nombre, u.apellidos, u.email, u.telefono, u.avatar_url, u.fecha_alta, u.ultima_visita, u.total_visitas, u.activo, u.dni,
        m.nombre AS membresia, m.precio AS membresia_precio, m.id AS membresia_id,
        c.id AS contrato_id, c.estado AS contrato_estado, c.fecha_fin,
        COALESCE(SUM(cu.cantidad_disponible) FILTER (WHERE cu.activo AND (cu.fecha_caducidad IS NULL OR cu.fecha_caducidad > NOW())), 0) AS creditos_disponibles
      FROM usuarios u
      LEFT JOIN contratos c ON c.usuario_id = u.id AND c.estado IN ('activo','pausado')
      LEFT JOIN membresias m ON m.id = c.membresia_id
      LEFT JOIN creditos_usuario cu ON cu.usuario_id = u.id
      WHERE ${where.join(' AND ')}
      GROUP BY u.id, m.nombre, m.precio, m.id, c.id, c.estado, c.fecha_fin
      ORDER BY ${orderBy}
      LIMIT $${i} OFFSET $${i + 1}`;
    params.push(lim, offset);

    const [data, countRes] = await Promise.all([
      db.query(sql, params),
      db.query(`SELECT COUNT(DISTINCT u.id) FROM usuarios u LEFT JOIN contratos c ON c.usuario_id = u.id AND c.estado IN ('activo','pausado') WHERE ${where.join(' AND ')}`, params.slice(0, -2))
    ]);

    res.json({
      socios: data.rows,
      total: parseInt(countRes.rows[0].count),
      pagina: pag, limite: lim,
      paginas: Math.ceil(parseInt(countRes.rows[0].count) / lim)
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/socios/stats — estadísticas rápidas
router.get('/stats', auth, esAdmin, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT
        COUNT(*) FILTER (WHERE activo = TRUE) AS activos,
        COUNT(*) FILTER (WHERE activo = FALSE) AS bajas,
        COUNT(*) FILTER (WHERE fecha_alta >= date_trunc('month', NOW())) AS nuevos_mes
      FROM usuarios WHERE rol = 'socio'`);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/socios/:id — detalle completo del socio
router.get('/:id', auth, esPropioOAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const [socio, contratos, creditos, accesos, reservas, pagos, medidas] = await Promise.all([
      db.query('SELECT * FROM usuarios WHERE id = $1', [id]),
      db.query(`SELECT c.*, m.nombre AS membresia_nombre, m.precio FROM contratos c JOIN membresias m ON m.id = c.membresia_id WHERE c.usuario_id = $1 ORDER BY c.created_at DESC`, [id]),
      db.query(`SELECT cu.*, tc.nombre AS tipo_nombre, tc.color, tc.icono FROM creditos_usuario cu JOIN tipos_credito tc ON tc.id = cu.tipo_credito_id WHERE cu.usuario_id = $1 AND cu.activo = TRUE ORDER BY cu.fecha_caducidad ASC NULLS LAST`, [id]),
      db.query(`SELECT a.*, tc.nombre AS credito_tipo FROM accesos a LEFT JOIN tipos_credito tc ON tc.id = a.tipo_credito_id WHERE a.usuario_id = $1 ORDER BY a.timestamp DESC LIMIT 30`, [id]),
      db.query(`SELECT r.*, ta.nombre AS actividad, s.nombre AS sala, cl.fecha_inicio, cl.fecha_fin FROM reservas r JOIN clases cl ON cl.id = r.clase_id JOIN tipos_actividad ta ON ta.id = cl.tipo_actividad_id JOIN salas s ON s.id = cl.sala_id WHERE r.usuario_id = $1 ORDER BY cl.fecha_inicio DESC LIMIT 20`, [id]),
      db.query('SELECT * FROM pagos WHERE usuario_id = $1 ORDER BY created_at DESC LIMIT 20', [id]),
      db.query('SELECT * FROM medidas_progreso WHERE usuario_id = $1 ORDER BY fecha DESC LIMIT 12', [id])
    ]);

    if (!socio.rows.length) return res.status(404).json({ error: 'Socio no encontrado' });
    const u = socio.rows[0];
    delete u.password_hash;

    res.json({ socio: u, contratos: contratos.rows, creditos: creditos.rows, accesos: accesos.rows, reservas: reservas.rows, pagos: pagos.rows, medidas: medidas.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/socios — crear nuevo socio
router.post('/', auth, esAdmin, async (req, res) => {
  try {
    const { email, nombre, apellidos, telefono, fecha_nacimiento, dni, genero, direccion, ciudad, codigo_postal, notas, membresia_id, consentimiento_rgpd = false } = req.body;
    if (!email || !nombre || !apellidos) return res.status(400).json({ error: 'Email, nombre y apellidos son obligatorios' });

    const pwd_tmp = crypto.randomBytes(8).toString('hex');
    const hash = await bcrypt.hash(pwd_tmp, 12);
    const qr_secret = crypto.randomBytes(32).toString('hex');

    const result = await db.transaction(async (client) => {
      // Crear usuario
      const { rows: [socio] } = await client.query(
        `INSERT INTO usuarios (email, password_hash, nombre, apellidos, telefono, fecha_nacimiento, dni, genero, direccion, ciudad, codigo_postal, notas, qr_secret, rol, consentimiento_rgpd)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'socio',$14) RETURNING *`,
        [email.toLowerCase(), hash, nombre, apellidos, telefono, fecha_nacimiento || null, dni, genero, direccion, ciudad, codigo_postal, notas, qr_secret, consentimiento_rgpd]
      );

      // Si viene membresía, crear contrato y asignar créditos
      if (membresia_id) {
        const { rows: [mem] } = await client.query('SELECT * FROM membresias WHERE id = $1 AND activo = TRUE', [membresia_id]);
        if (mem) {
          const durMs = mem.duracion_unidad === 'dias' ? mem.duracion_cantidad * 86400000 :
                        mem.duracion_unidad === 'semanas' ? mem.duracion_cantidad * 7 * 86400000 :
                        mem.duracion_cantidad * 30 * 86400000;
          const fecha_fin = new Date(Date.now() + durMs);
          const { rows: [contrato] } = await client.query(
            `INSERT INTO contratos (usuario_id, membresia_id, estado, fecha_inicio, fecha_fin, precio_pagado, created_by)
             VALUES ($1,$2,'activo',NOW(),$3,$4,$5) RETURNING id`,
            [socio.id, membresia_id, fecha_fin, mem.precio, req.user.id]
          );
          // Asignar créditos
          const { rows: mcs } = await client.query('SELECT * FROM membresia_creditos WHERE membresia_id = $1', [membresia_id]);
          for (const mc of mcs) {
            const caducidad = mc.validez_dias ? new Date(Date.now() + mc.validez_dias * 86400000) : fecha_fin;
            await client.query(
              `INSERT INTO creditos_usuario (usuario_id, tipo_credito_id, contrato_id, cantidad_total, fecha_caducidad, motivo)
               VALUES ($1,$2,$3,$4,$5,'Alta inicial - ' || $6)`,
              [socio.id, mc.tipo_credito_id, contrato.id, mc.cantidad, caducidad, mem.nombre]
            );
          }
        }
      }
      return socio;
    });

    delete result.password_hash;
    res.status(201).json({ socio: result, password_provisional: pwd_tmp, mensaje: 'Socio creado. Se le enviará email con sus credenciales.' });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'El email ya está registrado' });
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/socios/:id — actualizar socio
router.put('/:id', auth, esPropioOAdmin, async (req, res) => {
  try {
    const campos = ['nombre','apellidos','telefono','fecha_nacimiento','dni','genero','direccion','ciudad','codigo_postal','notas','activo'];
    const sets = []; const vals = []; let i = 1;
    for (const c of campos) {
      if (req.body[c] !== undefined) { sets.push(`${c} = $${i}`); vals.push(req.body[c]); i++; }
    }
    if (!sets.length) return res.status(400).json({ error: 'Nada que actualizar' });
    vals.push(req.params.id);
    const { rows } = await db.query(`UPDATE usuarios SET ${sets.join(',')} WHERE id = $${i} RETURNING *`, vals);
    if (!rows.length) return res.status(404).json({ error: 'Socio no encontrado' });
    delete rows[0].password_hash;
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/socios/:id — dar de baja (soft delete)
router.delete('/:id', auth, esAdmin, async (req, res) => {
  try {
    await db.query('UPDATE usuarios SET activo = FALSE, fecha_baja = CURRENT_DATE WHERE id = $1', [req.params.id]);
    await db.query("UPDATE contratos SET estado = 'cancelado' WHERE usuario_id = $1 AND estado = 'activo'", [req.params.id]);
    res.json({ ok: true, mensaje: 'Socio dado de baja' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/socios/:id/qr — obtener QR del socio
router.get('/:id/qr', auth, async (req, res) => {
  try {
    const esMio = req.params.id === req.user.id;
    const esAdm = ['superadmin','admin','staff'].includes(req.user.rol);
    if (!esMio && !esAdm) return res.status(403).json({ error: 'Acceso denegado' });

    const { rows } = await db.query('SELECT id, nombre, apellidos, qr_secret FROM usuarios WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Socio no encontrado' });
    const u = rows[0];

    const payload = JSON.stringify({ uid: u.id, t: Date.now() });
    const qrDataURL = await QRCode.toDataURL(payload, { width: 300, margin: 2 });
    res.json({ qr_image: qrDataURL, socio: `${u.nombre} ${u.apellidos || ''}`, id: u.id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/socios/:id/creditos — añadir créditos manualmente
router.post('/:id/creditos', auth, esAdmin, async (req, res) => {
  try {
    const { tipo_credito_id, cantidad, fecha_caducidad, motivo } = req.body;
    if (!tipo_credito_id || !cantidad) return res.status(400).json({ error: 'tipo_credito_id y cantidad son requeridos' });
    const { rows } = await db.query(
      `INSERT INTO creditos_usuario (usuario_id, tipo_credito_id, cantidad_total, fecha_caducidad, motivo)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [req.params.id, tipo_credito_id, cantidad, fecha_caducidad || null, motivo || 'Añadido manualmente']
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/socios/:id/accesos — historial de accesos del socio
router.get('/:id/accesos', auth, esPropioOAdmin, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT a.*, tc.nombre AS tipo_credito FROM accesos a LEFT JOIN tipos_credito tc ON tc.id = a.tipo_credito_id
       WHERE a.usuario_id = $1 ORDER BY a.timestamp DESC LIMIT 100`, [req.params.id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/socios/importar-csv — importar desde Virtuagym
router.post('/importar-csv', auth, esAdmin, async (req, res) => {
  try {
    const { socios } = req.body;
    if (!socios?.length) return res.status(400).json({ error: 'Array de socios requerido' });
    const importados = []; const errores = [];
    for (const s of socios) {
      try {
        if (!s.email || !s.nombre) { errores.push({ email: s.email, error: 'Faltan datos obligatorios' }); continue; }
        const pwd = crypto.randomBytes(8).toString('hex');
        const hash = await bcrypt.hash(pwd, 10);
        const qr_secret = crypto.randomBytes(32).toString('hex');
        const { rows } = await db.query(
          `INSERT INTO usuarios (email, password_hash, nombre, apellidos, telefono, qr_secret, rol, fecha_alta, activo)
           VALUES ($1,$2,$3,$4,$5,$6,'socio',$7,TRUE)
           ON CONFLICT (email) DO UPDATE SET nombre=EXCLUDED.nombre, apellidos=EXCLUDED.apellidos, telefono=EXCLUDED.telefono
           RETURNING id, email, nombre, apellidos`,
          [s.email.toLowerCase(), hash, s.nombre, s.apellidos || '', s.telefono || '', qr_secret, s.fecha_alta || new Date()]
        );
        importados.push({ ...rows[0], password_provisional: pwd });
      } catch (e) { errores.push({ email: s.email, error: e.message }); }
    }
    res.json({ importados: importados.length, errores: errores.length, detalle_errores: errores, socios: importados });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
