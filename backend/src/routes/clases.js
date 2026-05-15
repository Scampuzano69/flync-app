const router = require('express').Router();
const db = require('../config/db');
const { auth, esAdmin, esEntrenador } = require('../middleware/auth');

// GET /api/clases — clases por semana/rango
router.get('/', auth, async (req, res) => {
  try {
    const { desde, hasta, sala_id, entrenador_id, actividad_id } = req.query;
    const fechaDesde = desde || new Date().toISOString().split('T')[0];
    const fechaHasta = hasta || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

    let where = ['cl.cancelada = FALSE', 'cl.fecha_inicio >= $1', 'cl.fecha_inicio <= $2'];
    const params = [fechaDesde + 'T00:00:00', fechaHasta + 'T23:59:59'];
    let i = 3;
    if (sala_id) { where.push(`cl.sala_id = $${i}`); params.push(parseInt(sala_id)); i++; }
    if (entrenador_id) { where.push(`cl.entrenador_id = $${i}`); params.push(entrenador_id); i++; }
    if (actividad_id) { where.push(`cl.tipo_actividad_id = $${i}`); params.push(parseInt(actividad_id)); i++; }

    const { rows } = await db.query(`
      SELECT cl.id, cl.fecha_inicio, cl.fecha_fin, cl.aforo_maximo, cl.titulo, cl.cancelada,
             cl.creditos_coste, cl.precio_drop_in, cl.notas,
             ta.nombre AS actividad, ta.color AS actividad_color, ta.id AS actividad_id,
             s.nombre AS sala, s.color AS sala_color, s.id AS sala_id,
             u.id AS entrenador_id, u.nombre || ' ' || COALESCE(u.apellidos,'') AS entrenador, u.avatar_url AS entrenador_avatar,
             COUNT(r.id) FILTER (WHERE r.estado = 'confirmada') AS reservas,
             cl.aforo_maximo - COUNT(r.id) FILTER (WHERE r.estado = 'confirmada') AS plazas_libres,
             CASE WHEN my_r.id IS NOT NULL THEN true ELSE false END AS yo_reservado,
             my_r.id AS mi_reserva_id, my_r.estado AS mi_reserva_estado
      FROM clases cl
      JOIN tipos_actividad ta ON ta.id = cl.tipo_actividad_id
      JOIN salas s ON s.id = cl.sala_id
      LEFT JOIN usuarios u ON u.id = cl.entrenador_id
      LEFT JOIN reservas r ON r.clase_id = cl.id
      LEFT JOIN reservas my_r ON my_r.clase_id = cl.id AND my_r.usuario_id = $${i} AND my_r.estado = 'confirmada'
      WHERE ${where.join(' AND ')}
      GROUP BY cl.id, ta.nombre, ta.color, ta.id, s.nombre, s.color, s.id, u.id, u.nombre, u.apellidos, u.avatar_url, my_r.id, my_r.estado
      ORDER BY cl.fecha_inicio`, [...params, req.user.id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/clases/actividades — tipos de actividad
router.get('/actividades', auth, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT ta.*, tc.nombre AS tipo_credito FROM tipos_actividad ta LEFT JOIN tipos_credito tc ON tc.id = ta.tipo_credito_id WHERE ta.activo = TRUE ORDER BY ta.nombre');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/clases/salas
router.get('/salas', auth, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM salas WHERE activo = TRUE ORDER BY orden');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/clases/:id — detalle de clase con reservas
router.get('/:id', auth, async (req, res) => {
  try {
    const [clase, reservas] = await Promise.all([
      db.query(`SELECT cl.*, ta.nombre AS actividad, ta.color, s.nombre AS sala, u.nombre || ' ' || COALESCE(u.apellidos,'') AS entrenador
                FROM clases cl JOIN tipos_actividad ta ON ta.id = cl.tipo_actividad_id JOIN salas s ON s.id = cl.sala_id
                LEFT JOIN usuarios u ON u.id = cl.entrenador_id WHERE cl.id = $1`, [req.params.id]),
      db.query(`SELECT r.*, u.nombre, u.apellidos, u.email, u.avatar_url
                FROM reservas r JOIN usuarios u ON u.id = r.usuario_id
                WHERE r.clase_id = $1 AND r.estado != 'cancelada' ORDER BY r.fecha_reserva`, [req.params.id])
    ]);
    if (!clase.rows.length) return res.status(404).json({ error: 'Clase no encontrada' });
    res.json({ ...clase.rows[0], reservas: reservas.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/clases — crear clase (soporta recurrencia)
router.post('/', auth, esEntrenador, async (req, res) => {
  try {
    const { sala_id, tipo_actividad_id, entrenador_id, titulo, descripcion, fecha_inicio, fecha_fin, aforo_maximo, credito_requerido_id, creditos_coste, precio_drop_in, recurrente, recurrencia_tipo, recurrencia_dias, recurrencia_fin, notas } = req.body;
    if (!sala_id || !tipo_actividad_id || !fecha_inicio || !fecha_fin) {
      return res.status(400).json({ error: 'sala_id, tipo_actividad_id, fecha_inicio y fecha_fin son obligatorios' });
    }

    const clases_creadas = [];
    const ent_id = entrenador_id || (req.user.rol === 'entrenador' ? req.user.id : null);

    if (!recurrente) {
      const { rows: [cl] } = await db.query(
        `INSERT INTO clases (sala_id, tipo_actividad_id, entrenador_id, titulo, descripcion, fecha_inicio, fecha_fin, aforo_maximo, credito_requerido_id, creditos_coste, precio_drop_in, notas)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
        [sala_id, tipo_actividad_id, ent_id, titulo, descripcion, fecha_inicio, fecha_fin, aforo_maximo || 8, credito_requerido_id || null, creditos_coste || 1, precio_drop_in || null, notas]
      );
      return res.status(201).json({ clase: cl, creadas: 1 });
    }

    // Recurrencia semanal
    if (recurrente && recurrencia_tipo === 'semanal' && recurrencia_dias?.length) {
      const { rows: [clPadre] } = await db.query(
        `INSERT INTO clases (sala_id, tipo_actividad_id, entrenador_id, titulo, descripcion, fecha_inicio, fecha_fin, aforo_maximo, credito_requerido_id, creditos_coste, precio_drop_in, recurrente, recurrencia_tipo, recurrencia_dias, recurrencia_fin, notas)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,TRUE,$12,$13,$14,$15) RETURNING *`,
        [sala_id, tipo_actividad_id, ent_id, titulo, descripcion, fecha_inicio, fecha_fin, aforo_maximo || 8, credito_requerido_id || null, creditos_coste || 1, precio_drop_in || null, recurrencia_tipo, recurrencia_dias, recurrencia_fin, notas]
      );
      clases_creadas.push(clPadre);

      const dur = new Date(fecha_fin) - new Date(fecha_inicio);
      let fecha = new Date(fecha_inicio);
      const fin = new Date(recurrencia_fin);
      fecha.setDate(fecha.getDate() + 1);

      while (fecha <= fin && clases_creadas.length < 300) {
        const dow = fecha.getDay(); // 0=domingo
        if (recurrencia_dias.includes(dow)) {
          const fi = new Date(fecha);
          fi.setHours(new Date(fecha_inicio).getHours(), new Date(fecha_inicio).getMinutes());
          const ff = new Date(fi.getTime() + dur);
          const { rows: [cl] } = await db.query(
            `INSERT INTO clases (sala_id, tipo_actividad_id, entrenador_id, titulo, descripcion, fecha_inicio, fecha_fin, aforo_maximo, credito_requerido_id, creditos_coste, precio_drop_in, clase_padre_id)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
            [sala_id, tipo_actividad_id, ent_id, titulo, descripcion, fi.toISOString(), ff.toISOString(), aforo_maximo || 8, credito_requerido_id || null, creditos_coste || 1, precio_drop_in || null, clPadre.id]
          );
          clases_creadas.push(cl);
        }
        fecha.setDate(fecha.getDate() + 1);
      }
      return res.status(201).json({ clase: clPadre, creadas: clases_creadas.length });
    }

    res.status(400).json({ error: 'Configuración de recurrencia inválida' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/clases/:id
router.put('/:id', auth, esEntrenador, async (req, res) => {
  try {
    const campos = ['titulo','descripcion','fecha_inicio','fecha_fin','aforo_maximo','entrenador_id','sala_id','tipo_actividad_id','cancelada','cancelada_motivo','notas','credito_requerido_id','creditos_coste'];
    const sets = []; const vals = []; let i = 1;
    for (const c of campos) { if (req.body[c] !== undefined) { sets.push(`${c} = $${i}`); vals.push(req.body[c]); i++; } }
    if (!sets.length) return res.status(400).json({ error: 'Nada que actualizar' });
    vals.push(req.params.id);
    const { rows } = await db.query(`UPDATE clases SET ${sets.join(',')} WHERE id = $${i} RETURNING *`, vals);
    if (!rows.length) return res.status(404).json({ error: 'Clase no encontrada' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/clases/:id
router.delete('/:id', auth, esEntrenador, async (req, res) => {
  try {
    const { motivo } = req.body;
    await db.query('UPDATE clases SET cancelada = TRUE, cancelada_motivo = $1 WHERE id = $2', [motivo || 'Cancelada por admin', req.params.id]);
    res.json({ ok: true, mensaje: 'Clase cancelada' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
