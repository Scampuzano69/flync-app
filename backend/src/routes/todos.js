// ── RESERVAS ─────────────────────────────────────────────────────
const reservasRouter = require('express').Router();
const db = require('../config/db');
const { auth, esAdmin } = require('../middleware/auth');

reservasRouter.post('/', auth, async (req, res) => {
  try {
    const { clase_id } = req.body;
    const uid = req.user.id;
    // Verificar clase y plazas
    const { rows: clRows } = await db.query(
      `SELECT cl.*, COUNT(r.id) FILTER (WHERE r.estado='confirmada') AS reservas_actuales FROM clases cl LEFT JOIN reservas r ON r.clase_id = cl.id WHERE cl.id = $1 AND cl.cancelada = FALSE GROUP BY cl.id`, [clase_id]);
    if (!clRows.length) return res.status(404).json({ error: 'Clase no encontrada o cancelada' });
    const cl = clRows[0];
    if (parseInt(cl.reservas_actuales) >= cl.aforo_maximo) {
      await db.query(`INSERT INTO reservas (clase_id, usuario_id, estado) VALUES ($1,$2,'lista_espera') ON CONFLICT (clase_id, usuario_id) DO NOTHING`, [clase_id, uid]);
      return res.json({ estado: 'lista_espera', mensaje: 'Añadido a lista de espera' });
    }
    // Verificar/consumir crédito
    let credUsadoId = null;
    if (cl.credito_requerido_id) {
      const { rows: creds } = await db.query(
        `SELECT cu.id, cu.cantidad_disponible FROM creditos_usuario cu WHERE cu.usuario_id = $1 AND cu.tipo_credito_id = $2 AND cu.cantidad_disponible >= $3 AND cu.activo = TRUE AND (cu.fecha_caducidad IS NULL OR cu.fecha_caducidad > NOW()) ORDER BY cu.fecha_caducidad ASC NULLS LAST LIMIT 1`,
        [uid, cl.credito_requerido_id, cl.creditos_coste || 1]);
      if (!creds.length) return res.status(402).json({ error: 'Sin créditos suficientes para reservar esta clase' });
      await db.query('UPDATE creditos_usuario SET cantidad_usada = cantidad_usada + $1 WHERE id = $2', [cl.creditos_coste || 1, creds[0].id]);
      credUsadoId = creds[0].id;
    }
    const { rows } = await db.query(
      `INSERT INTO reservas (clase_id, usuario_id, estado, credito_usado_id, creditos_descontados) VALUES ($1,$2,'confirmada',$3,$4)
       ON CONFLICT (clase_id, usuario_id) DO UPDATE SET estado='confirmada', credito_usado_id=$3, fecha_cancelacion=NULL RETURNING *`,
      [clase_id, uid, credUsadoId, cl.creditos_coste || 0]);
    res.status(201).json({ reserva: rows[0], mensaje: 'Reserva confirmada' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

reservasRouter.delete('/:id', auth, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM reservas WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Reserva no encontrada' });
    const r = rows[0];
    const esAdmin = ['superadmin','admin','staff'].includes(req.user.rol);
    if (r.usuario_id !== req.user.id && !esAdmin) return res.status(403).json({ error: 'No autorizado' });
    // Devolver crédito si hay suficiente antelación (>2h)
    if (r.credito_usado_id) {
      const { rows: clRows } = await db.query('SELECT fecha_inicio FROM clases WHERE id = $1', [r.clase_id]);
      const horasHasta = (new Date(clRows[0]?.fecha_inicio) - Date.now()) / 3600000;
      if (horasHasta > 2) await db.query('UPDATE creditos_usuario SET cantidad_usada = cantidad_usada - $1 WHERE id = $2', [r.creditos_descontados || 1, r.credito_usado_id]);
    }
    await db.query(`UPDATE reservas SET estado='cancelada', fecha_cancelacion=NOW(), cancelada_por=$1 WHERE id=$2`, [req.user.id, req.params.id]);
    // Promover lista de espera
    const { rows: esp } = await db.query(`SELECT * FROM reservas WHERE clase_id=$1 AND estado='lista_espera' ORDER BY fecha_reserva ASC LIMIT 1`, [r.clase_id]);
    if (esp.length) await db.query(`UPDATE reservas SET estado='confirmada' WHERE id=$1`, [esp[0].id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

reservasRouter.get('/mis-reservas', auth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT r.*, ta.nombre AS actividad, ta.color, s.nombre AS sala, cl.fecha_inicio, cl.fecha_fin, u.nombre||' '||COALESCE(u.apellidos,'') AS entrenador
       FROM reservas r JOIN clases cl ON cl.id = r.clase_id JOIN tipos_actividad ta ON ta.id = cl.tipo_actividad_id JOIN salas s ON s.id = cl.sala_id LEFT JOIN usuarios u ON u.id = cl.entrenador_id
       WHERE r.usuario_id=$1 AND r.estado='confirmada' AND cl.fecha_inicio >= NOW() ORDER BY cl.fecha_inicio`, [req.user.id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports.reservasRouter = reservasRouter;

// ── PAGOS ─────────────────────────────────────────────────────────
const pagosRouter = require('express').Router();

pagosRouter.get('/', auth, esAdmin, async (req, res) => {
  try {
    const { estado, desde, hasta, usuario_id, pagina = 1, limite = 20 } = req.query;
    let where = ['1=1']; const params = []; let i = 1;
    if (estado) { where.push(`p.estado=$${i}`); params.push(estado); i++; }
    if (desde) { where.push(`DATE(p.created_at) >= $${i}`); params.push(desde); i++; }
    if (hasta) { where.push(`DATE(p.created_at) <= $${i}`); params.push(hasta); i++; }
    if (usuario_id) { where.push(`p.usuario_id=$${i}`); params.push(usuario_id); i++; }
    const lim = Math.min(200, parseInt(limite)); const off = (Math.max(1, parseInt(pagina))-1)*lim;
    params.push(lim, off);
    const { rows } = await db.query(
      `SELECT p.*, u.nombre||' '||COALESCE(u.apellidos,'') AS socio_nombre, u.email AS socio_email
       FROM pagos p JOIN usuarios u ON u.id = p.usuario_id
       WHERE ${where.join(' AND ')} ORDER BY p.created_at DESC LIMIT $${i} OFFSET $${i+1}`, params);
    const total = await db.query(`SELECT COUNT(*), COALESCE(SUM(importe_total) FILTER (WHERE estado='pagado'),0) AS total_cobrado FROM pagos p WHERE ${where.join(' AND ')}`, params.slice(0,-2));
    res.json({ pagos: rows, total: parseInt(total.rows[0].count), total_cobrado: total.rows[0].total_cobrado });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

pagosRouter.post('/', auth, esAdmin, async (req, res) => {
  try {
    const { usuario_id, contrato_id, concepto, importe_base, iva_porcentaje = 21, metodo_pago, categoria_ingreso, notas } = req.body;
    if (!usuario_id || !concepto || importe_base === undefined) return res.status(400).json({ error: 'usuario_id, concepto e importe_base son requeridos' });
    const base = parseFloat(importe_base);
    const iva = parseFloat(iva_porcentaje);
    const imp_iva = base * iva / 100;
    const total = base + imp_iva;
    // Numero de factura
    const anio = new Date().getFullYear();
    const { rows: last } = await db.query(`SELECT numero_factura FROM pagos WHERE numero_factura LIKE $1 ORDER BY numero_factura DESC LIMIT 1`, [`FLY-${anio}-%`]);
    const num = last.length ? parseInt(last[0].numero_factura.split('-')[2]) + 1 : 1;
    const numFactura = `FLY-${anio}-${String(num).padStart(4,'0')}`;
    const { rows } = await db.query(
      `INSERT INTO pagos (usuario_id, contrato_id, concepto, importe_base, iva_porcentaje, importe_iva, importe_total, estado, metodo_pago, numero_factura, categoria_ingreso, notas, fecha_pago, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'pagado',$8,$9,$10,$11,NOW(),$12) RETURNING *`,
      [usuario_id, contrato_id||null, concepto, base, iva, imp_iva, total, metodo_pago||'efectivo', numFactura, categoria_ingreso||'Membresias', notas||null, req.user.id]);
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

pagosRouter.get('/resumen', auth, esAdmin, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT
        COALESCE(SUM(importe_total) FILTER (WHERE estado='pagado' AND date_trunc('month',created_at)=date_trunc('month',NOW())),0) AS mes_actual,
        COALESCE(SUM(importe_total) FILTER (WHERE estado='pagado' AND date_trunc('month',created_at)=date_trunc('month',NOW()-INTERVAL '1 month')),0) AS mes_anterior,
        COALESCE(SUM(importe_total) FILTER (WHERE estado='pendiente'),0) AS pendiente,
        COUNT(*) FILTER (WHERE estado='pendiente') AS facturas_pendientes,
        COUNT(*) FILTER (WHERE estado='pagado' AND date_trunc('month',created_at)=date_trunc('month',NOW())) AS facturas_mes
      FROM pagos`);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports.pagosRouter = pagosRouter;

// ── DASHBOARD ─────────────────────────────────────────────────────
const dashRouter = require('express').Router();

dashRouter.get('/', auth, esAdmin, async (req, res) => {
  try {
    const [socios, ingresos, accesos, clases, pendientes, ingresos6m, clasesHoy] = await Promise.all([
      db.query(`SELECT COUNT(*) FILTER (WHERE activo=TRUE) AS activos, COUNT(*) FILTER (WHERE activo=FALSE) AS bajas, COUNT(*) FILTER (WHERE fecha_alta>=date_trunc('month',NOW())) AS nuevos_mes FROM usuarios WHERE rol='socio'`),
      db.query(`SELECT COALESCE(SUM(importe_total) FILTER (WHERE estado='pagado'),0) AS cobrado_mes, COALESCE(SUM(importe_total) FILTER (WHERE estado='pendiente'),0) AS pendiente, COUNT(*) FILTER (WHERE estado='pagado') AS facturas_pagadas, COUNT(*) FILTER (WHERE estado='pendiente') AS facturas_pendientes FROM pagos WHERE date_trunc('month',created_at)=date_trunc('month',NOW())`),
      db.query(`SELECT COUNT(*) FILTER (WHERE resultado='ok') AS entradas_ok, COUNT(*) FILTER (WHERE resultado!='ok') AS denegados, COUNT(DISTINCT usuario_id) FILTER (WHERE resultado='ok') AS socios_unicos FROM accesos WHERE DATE(timestamp AT TIME ZONE 'Europe/Madrid')=CURRENT_DATE`),
      db.query(`SELECT COUNT(*) AS total FROM clases WHERE fecha_inicio BETWEEN date_trunc('week',NOW()) AND date_trunc('week',NOW())+INTERVAL '7 days' AND cancelada=FALSE`),
      db.query(`SELECT COUNT(*) AS total FROM pagos WHERE estado='pendiente'`),
      db.query(`SELECT to_char(date_trunc('month',created_at),'Mon YYYY') AS mes, date_trunc('month',created_at) AS fecha, COALESCE(SUM(importe_total) FILTER (WHERE estado='pagado'),0) AS total FROM pagos WHERE created_at>=NOW()-INTERVAL '6 months' GROUP BY date_trunc('month',created_at) ORDER BY fecha`),
      db.query(`SELECT cl.id, cl.fecha_inicio, cl.fecha_fin, cl.aforo_maximo, ta.nombre AS actividad, ta.color, s.nombre AS sala, COUNT(r.id) FILTER (WHERE r.estado='confirmada') AS reservas FROM clases cl JOIN tipos_actividad ta ON ta.id=cl.tipo_actividad_id JOIN salas s ON s.id=cl.sala_id LEFT JOIN reservas r ON r.clase_id=cl.id WHERE DATE(cl.fecha_inicio AT TIME ZONE 'Europe/Madrid')=CURRENT_DATE AND cl.cancelada=FALSE GROUP BY cl.id,ta.nombre,ta.color,s.nombre ORDER BY cl.fecha_inicio LIMIT 12`)
    ]);

    const actividad = await db.query(`
      (SELECT 'acceso' AS tipo, a.timestamp AS fecha, u.nombre||' '||COALESCE(u.apellidos,'') AS descripcion, a.resultado AS estado, NULL AS extra
       FROM accesos a LEFT JOIN usuarios u ON u.id=a.usuario_id WHERE a.resultado='ok' ORDER BY a.timestamp DESC LIMIT 5)
      UNION ALL
      (SELECT 'reserva' AS tipo, r.fecha_reserva AS fecha, u.nombre||' '||COALESCE(u.apellidos,'') AS descripcion, r.estado, ta.nombre AS extra
       FROM reservas r JOIN usuarios u ON u.id=r.usuario_id JOIN clases cl ON cl.id=r.clase_id JOIN tipos_actividad ta ON ta.id=cl.tipo_actividad_id
       ORDER BY r.fecha_reserva DESC LIMIT 5)
      ORDER BY fecha DESC LIMIT 10`);

    res.json({
      socios: socios.rows[0], ingresos: ingresos.rows[0], accesos_hoy: accesos.rows[0],
      clases_semana: clases.rows[0], cuotas_pendientes: pendientes.rows[0].total,
      ingresos_6_meses: ingresos6m.rows, actividad_reciente: actividad.rows, clases_hoy: clasesHoy.rows,
      timestamp: new Date().toISOString()
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports.dashRouter = dashRouter;

// ── CONFIG ────────────────────────────────────────────────────────
const cfgRouter = require('express').Router();

cfgRouter.get('/', auth, esAdmin, async (req, res) => {
  try {
    const [neg, salas, creditos, actividades, cats] = await Promise.all([
      db.query('SELECT id,nombre,nombre_legal,descripcion,calle,codigo_postal,ciudad,pais,telefono,email,website,logo_url,banner_url,iva_defecto,moneda,horario_24h,titular_cuenta,iban,bic,smtp_host,smtp_port,smtp_user,smtp_from FROM negocio LIMIT 1'),
      db.query('SELECT * FROM salas ORDER BY orden'),
      db.query('SELECT * FROM tipos_credito ORDER BY nombre'),
      db.query('SELECT * FROM tipos_actividad ORDER BY nombre'),
      db.query('SELECT * FROM categorias_membresia ORDER BY orden')
    ]);
    res.json({ negocio: neg.rows[0], salas: salas.rows, tipos_credito: creditos.rows, tipos_actividad: actividades.rows, categorias_membresia: cats.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

cfgRouter.put('/', auth, esAdmin, async (req, res) => {
  try {
    const campos = ['nombre','nombre_legal','descripcion','calle','codigo_postal','ciudad','telefono','email','website','logo_url','iva_defecto','horario_24h','smtp_host','smtp_port','smtp_user','smtp_from'];
    const sets = []; const vals = []; let i = 1;
    for (const c of campos) { if (req.body[c] !== undefined) { sets.push(`${c}=$${i}`); vals.push(req.body[c]); i++; } }
    if (!sets.length) return res.status(400).json({ error: 'Nada que actualizar' });
    const { rows } = await db.query(`UPDATE negocio SET ${sets.join(',')} WHERE id=1 RETURNING *`, vals);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

cfgRouter.put('/stripe', auth, esAdmin, async (req, res) => {
  try {
    const { stripe_secret_key, stripe_publishable_key, stripe_webhook_secret } = req.body;
    await db.query('UPDATE negocio SET stripe_secret_key=$1, stripe_publishable_key=$2, stripe_webhook_secret=$3 WHERE id=1',
      [stripe_secret_key, stripe_publishable_key, stripe_webhook_secret]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

cfgRouter.put('/imc2', auth, esAdmin, async (req, res) => {
  try {
    const { imc2_api_key, imc2_base_url, imc2_device_id } = req.body;
    await db.query('UPDATE negocio SET imc2_api_key=$1, imc2_base_url=$2, imc2_device_id=$3 WHERE id=1', [imc2_api_key, imc2_base_url, imc2_device_id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports.cfgRouter = cfgRouter;

// ── CRÉDITOS ──────────────────────────────────────────────────────
const credRouter = require('express').Router();

credRouter.get('/tipos', auth, async (req, res) => {
  const { rows } = await db.query('SELECT * FROM tipos_credito WHERE activo=TRUE ORDER BY nombre');
  res.json(rows);
});

credRouter.post('/tipos', auth, esAdmin, async (req, res) => {
  try {
    const { nombre, descripcion, color, icono, periodo_deducible } = req.body;
    if (!nombre) return res.status(400).json({ error: 'Nombre requerido' });
    const { rows } = await db.query('INSERT INTO tipos_credito (nombre,descripcion,color,icono,periodo_deducible) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [nombre, descripcion, color || '#1D9E75', icono || 'star', periodo_deducible || 'inmediato']);
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

credRouter.get('/usuario/:id', auth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT cu.*, tc.nombre AS tipo_nombre, tc.color, tc.icono FROM creditos_usuario cu JOIN tipos_credito tc ON tc.id=cu.tipo_credito_id WHERE cu.usuario_id=$1 AND cu.activo=TRUE ORDER BY cu.fecha_caducidad ASC NULLS LAST`, [req.params.id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports.credRouter = credRouter;

// ── CONTRATOS ─────────────────────────────────────────────────────
const contrRouter = require('express').Router();

contrRouter.get('/usuario/:id', auth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT c.*, m.nombre AS membresia_nombre, m.precio FROM contratos c JOIN membresias m ON m.id=c.membresia_id WHERE c.usuario_id=$1 ORDER BY c.created_at DESC`, [req.params.id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

contrRouter.post('/', auth, esAdmin, async (req, res) => {
  try {
    const { usuario_id, membresia_id, fecha_inicio, precio_pagado, metodo_pago, notas, auto_renovar } = req.body;
    if (!usuario_id || !membresia_id) return res.status(400).json({ error: 'usuario_id y membresia_id son requeridos' });
    const { rows: [mem] } = await db.query('SELECT * FROM membresias WHERE id=$1', [membresia_id]);
    if (!mem) return res.status(404).json({ error: 'Membresía no encontrada' });

    const result = await db.transaction(async (client) => {
      // Cancelar contratos activos previos
      await client.query("UPDATE contratos SET estado='cancelado' WHERE usuario_id=$1 AND estado='activo'", [usuario_id]);
      const durMs = mem.duracion_unidad === 'dias' ? mem.duracion_cantidad * 86400000 : mem.duracion_cantidad * 30 * 86400000;
      const fi = fecha_inicio ? new Date(fecha_inicio) : new Date();
      const ff = new Date(fi.getTime() + durMs);
      const { rows: [c] } = await client.query(
        `INSERT INTO contratos (usuario_id, membresia_id, estado, fecha_inicio, fecha_fin, precio_pagado, metodo_pago, auto_renovar, notas, created_by)
         VALUES ($1,$2,'activo',$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [usuario_id, membresia_id, fi, ff, precio_pagado || mem.precio, metodo_pago, auto_renovar || false, notas, req.user.id]);
      // Asignar créditos
      const { rows: mcs } = await client.query('SELECT * FROM membresia_creditos WHERE membresia_id=$1', [membresia_id]);
      for (const mc of mcs) {
        const caducidad = mc.validez_dias ? new Date(fi.getTime() + mc.validez_dias * 86400000) : ff;
        await client.query(`INSERT INTO creditos_usuario (usuario_id, tipo_credito_id, contrato_id, cantidad_total, fecha_caducidad, motivo) VALUES ($1,$2,$3,$4,$5,$6)`,
          [usuario_id, mc.tipo_credito_id, c.id, mc.cantidad, caducidad, `Contrato ${mem.nombre}`]);
      }
      return c;
    });
    res.status(201).json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

contrRouter.put('/:id/estado', auth, esAdmin, async (req, res) => {
  try {
    const { estado, motivo } = req.body;
    const estados = ['activo','pausado','cancelado','vencido'];
    if (!estados.includes(estado)) return res.status(400).json({ error: 'Estado inválido' });
    const { rows } = await db.query('UPDATE contratos SET estado=$1 WHERE id=$2 RETURNING *', [estado, req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Contrato no encontrado' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports.contrRouter = contrRouter;

// ── NOTIFICACIONES ────────────────────────────────────────────────
const notifRouter = require('express').Router();

notifRouter.get('/', auth, esAdmin, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM notificaciones ORDER BY created_at DESC LIMIT 50');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

notifRouter.post('/', auth, esAdmin, async (req, res) => {
  try {
    const { titulo, mensaje, tipo = 'push', destinatarios_tipo = 'todos', membresia_filtro } = req.body;
    if (!titulo || !mensaje) return res.status(400).json({ error: 'Título y mensaje son requeridos' });
    const { rows } = await db.query(
      `INSERT INTO notificaciones (titulo, mensaje, tipo, destinatarios_tipo, membresia_filtro, estado_envio, fecha_envio, enviado_por) VALUES ($1,$2,$3,$4,$5,'enviado',NOW(),$6) RETURNING *`,
      [titulo, mensaje, tipo, destinatarios_tipo, membresia_filtro || null, req.user.id]);
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports.notifRouter = notifRouter;

// ── IMC2 WEBHOOK ──────────────────────────────────────────────────
const imc2Router = require('express').Router();

imc2Router.post('/webhook', async (req, res) => {
  try {
    const { event_type, card_data, device_id, device_name } = req.body;
    if (!['card_read','qr_read','rfid_read'].includes(event_type)) return res.json({ processed: false });
    // Reenviar a validación de acceso
    const accesosRoute = require('./accesos');
    req.body = { token: card_data, device_id, device_name, tipo: 'entrada' };
    // Llamada interna
    const fetch = require('node-fetch');
    const resp = await fetch(`http://localhost:${process.env.PORT || 3001}/api/accesos/validar`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: card_data, device_id, device_name })
    });
    const result = await resp.json();
    // El hardware iMC² espera: { access: true/false }
    res.json({ access: result.acceso === true, message: result.mensaje, result });
  } catch (err) { res.status(500).json({ access: false, error: err.message }); }
});

imc2Router.get('/estado', auth, async (req, res) => {
  const { rows } = await db.query('SELECT imc2_api_key, imc2_base_url, imc2_device_id FROM negocio LIMIT 1');
  const neg = rows[0];
  res.json({ conectado: !!neg.imc2_api_key, api_key_configurada: !!neg.imc2_api_key, device_id: neg.imc2_device_id, base_url: neg.imc2_base_url });
});

module.exports.imc2Router = imc2Router;

// ── IMPORTAR CSV ──────────────────────────────────────────────────
const importarRouter = require('express').Router();

importarRouter.post('/socios', auth, esAdmin, async (req, res) => {
  try {
    const { socios = [] } = req.body;
    const bcrypt = require('bcryptjs');
    const crypto = require('crypto');
    let ok = 0, err_count = 0, errors = [];
    for (const s of socios) {
      try {
        if (!s.email || !s.nombre) { errors.push({ email: s.email, err: 'Faltan campos' }); err_count++; continue; }
        const pwd = crypto.randomBytes(6).toString('hex');
        const hash = await bcrypt.hash(pwd, 10);
        const qr = crypto.randomBytes(32).toString('hex');
        await db.query(
          `INSERT INTO usuarios (email,password_hash,nombre,apellidos,telefono,qr_secret,rol,fecha_alta,activo) VALUES ($1,$2,$3,$4,$5,$6,'socio',$7,TRUE)
           ON CONFLICT (email) DO UPDATE SET nombre=EXCLUDED.nombre, apellidos=EXCLUDED.apellidos, updated_at=NOW()`,
          [s.email.toLowerCase(), hash, s.nombre, s.apellidos||'', s.telefono||'', qr, s.fecha_alta ? new Date(s.fecha_alta) : new Date()]
        );
        ok++;
      } catch(e) { errors.push({ email: s.email, err: e.message }); err_count++; }
    }
    res.json({ importados: ok, errores: err_count, detalle: errors });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports.importarRouter = importarRouter;

// ── ESTADÍSTICAS ──────────────────────────────────────────────────
const statsRouter = require('express').Router();

statsRouter.get('/ingresos', auth, esAdmin, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT date_trunc('month',created_at) AS mes, categoria_ingreso,
        SUM(importe_total) AS total, COUNT(*) AS facturas
      FROM pagos WHERE estado='pagado' AND created_at >= NOW() - INTERVAL '12 months'
      GROUP BY 1,2 ORDER BY 1 DESC`);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

statsRouter.get('/accesos-hora', auth, esAdmin, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT EXTRACT(HOUR FROM timestamp AT TIME ZONE 'Europe/Madrid') AS hora, COUNT(*) AS total
      FROM accesos WHERE resultado='ok' AND timestamp >= NOW() - INTERVAL '30 days'
      GROUP BY 1 ORDER BY 1`);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

statsRouter.get('/retencion', auth, esAdmin, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT date_trunc('month', fecha_alta) AS mes, COUNT(*) AS nuevos,
        COUNT(*) FILTER (WHERE activo=TRUE) AS activos
      FROM usuarios WHERE rol='socio' GROUP BY 1 ORDER BY 1 DESC LIMIT 12`);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports.statsRouter = statsRouter;

// ── FACTURAS ──────────────────────────────────────────────────────
const facturasRouter = require('express').Router();

facturasRouter.get('/:id/pdf', auth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT p.*, u.nombre||' '||COALESCE(u.apellidos,'') AS socio, u.email AS socio_email, u.dni AS socio_dni, n.nombre AS empresa, n.iban, n.calle, n.codigo_postal, n.ciudad
       FROM pagos p JOIN usuarios u ON u.id=p.usuario_id CROSS JOIN negocio n WHERE p.id=$1 LIMIT 1`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Factura no encontrada' });
    // Devolver datos para que el frontend genere el PDF
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports.facturasRouter = facturasRouter;
