const router = require('express').Router();
const db = require('../config/db');
const { auth, esAdmin } = require('../middleware/auth');

// GET /api/membresias — listar todas
router.get('/', auth, async (req, res) => {
  try {
    const { categoria_id, activo = 'true', buscar = '' } = req.query;
    let where = ['1=1']; const params = []; let i = 1;
    if (activo !== 'all') { where.push(`m.activo = $${i}`); params.push(activo !== 'false'); i++; }
    if (categoria_id) { where.push(`m.categoria_id = $${i}`); params.push(parseInt(categoria_id)); i++; }
    if (buscar) { where.push(`m.nombre ILIKE $${i}`); params.push(`%${buscar}%`); i++; }

    const { rows } = await db.query(`
      SELECT m.*,
        cm.nombre AS categoria_nombre,
        (SELECT COUNT(*) FROM contratos WHERE membresia_id = m.id AND estado = 'activo') AS contratos_activos,
        (SELECT json_agg(json_build_object('id',mc.id,'tipo_credito_id',mc.tipo_credito_id,'tipo_nombre',tc.nombre,'cantidad',mc.cantidad,'frecuencia',mc.frecuencia,'color',tc.color,'es_ilimitado',mc.es_ilimitado))
         FROM membresia_creditos mc JOIN tipos_credito tc ON tc.id = mc.tipo_credito_id
         WHERE mc.membresia_id = m.id) AS creditos
      FROM membresias m
      LEFT JOIN categorias_membresia cm ON cm.id = m.categoria_id
      WHERE ${where.join(' AND ')}
      ORDER BY cm.orden NULLS LAST, m.precio`, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/membresias/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT m.*, cm.nombre AS categoria_nombre,
        (SELECT COUNT(*) FROM contratos WHERE membresia_id = m.id AND estado = 'activo') AS contratos_activos,
        (SELECT json_agg(json_build_object('id',mc.id,'tipo_credito_id',mc.tipo_credito_id,'tipo_nombre',tc.nombre,'cantidad',mc.cantidad,'frecuencia',mc.frecuencia,'color',tc.color,'icono',tc.icono,'es_ilimitado',mc.es_ilimitado,'validez_dias',mc.validez_dias))
         FROM membresia_creditos mc JOIN tipos_credito tc ON tc.id = mc.tipo_credito_id WHERE mc.membresia_id = m.id) AS creditos
      FROM membresias m LEFT JOIN categorias_membresia cm ON cm.id = m.categoria_id WHERE m.id = $1`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Membresía no encontrada' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/membresias — crear nueva
router.post('/', auth, esAdmin, async (req, res) => {
  try {
    const { nombre, descripcion, descripcion_publica, categoria_id, precio, precio_prolongacion, precio_matricula, duracion_cantidad, duracion_unidad, renovacion_automatica, categoria_ingreso, visible_tienda, terminos_especificos, creditos = [] } = req.body;
    if (!nombre || precio === undefined) return res.status(400).json({ error: 'Nombre y precio son obligatorios' });

    const result = await db.transaction(async (client) => {
      const { rows: [mem] } = await client.query(
        `INSERT INTO membresias (nombre, descripcion, descripcion_publica, categoria_id, precio, precio_prolongacion, precio_matricula, duracion_cantidad, duracion_unidad, renovacion_automatica, categoria_ingreso, visible_tienda, terminos_especificos)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
        [nombre, descripcion, descripcion_publica, categoria_id || null, parseFloat(precio), precio_prolongacion || null, precio_matricula || 0, duracion_cantidad || 1, duracion_unidad || 'meses', renovacion_automatica || false, categoria_ingreso || 'Membresias', visible_tienda !== false, terminos_especificos || null]
      );
      // Insertar créditos
      for (const c of creditos) {
        await client.query(
          `INSERT INTO membresia_creditos (membresia_id, tipo_credito_id, cantidad, es_ilimitado, frecuencia, validez_dias, extra_inicio)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [mem.id, c.tipo_credito_id, c.cantidad || 1, c.es_ilimitado || false, c.frecuencia || 'mensual', c.validez_dias || null, c.extra_inicio || 0]
        );
      }
      return mem;
    });
    res.status(201).json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/membresias/:id
router.put('/:id', auth, esAdmin, async (req, res) => {
  try {
    const campos = ['nombre','descripcion','descripcion_publica','categoria_id','precio','precio_prolongacion','precio_matricula','duracion_cantidad','duracion_unidad','renovacion_automatica','categoria_ingreso','visible_tienda','terminos_especificos','activo'];
    const sets = []; const vals = []; let i = 1;
    for (const c of campos) {
      if (req.body[c] !== undefined) { sets.push(`${c} = $${i}`); vals.push(req.body[c]); i++; }
    }
    if (!sets.length) return res.status(400).json({ error: 'Nada que actualizar' });

    // Si vienen créditos, reemplazarlos
    if (req.body.creditos) {
      await db.query('DELETE FROM membresia_creditos WHERE membresia_id = $1', [req.params.id]);
      for (const c of req.body.creditos) {
        await db.query(
          `INSERT INTO membresia_creditos (membresia_id, tipo_credito_id, cantidad, es_ilimitado, frecuencia, validez_dias) VALUES ($1,$2,$3,$4,$5,$6)`,
          [req.params.id, c.tipo_credito_id, c.cantidad || 1, c.es_ilimitado || false, c.frecuencia || 'mensual', c.validez_dias || null]
        );
      }
    }

    vals.push(req.params.id);
    const { rows } = await db.query(`UPDATE membresias SET ${sets.join(',')} WHERE id = $${i} RETURNING *`, vals);
    if (!rows.length) return res.status(404).json({ error: 'Membresía no encontrada' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/membresias/:id
router.delete('/:id', auth, esAdmin, async (req, res) => {
  try {
    const { rows: contratos } = await db.query("SELECT COUNT(*) FROM contratos WHERE membresia_id = $1 AND estado = 'activo'", [req.params.id]);
    if (parseInt(contratos[0].count) > 0) {
      // Soft delete si tiene contratos activos
      await db.query('UPDATE membresias SET activo = FALSE WHERE id = $1', [req.params.id]);
      return res.json({ ok: true, mensaje: 'Membresía desactivada (tiene contratos activos)' });
    }
    await db.query('DELETE FROM membresias WHERE id = $1', [req.params.id]);
    res.json({ ok: true, mensaje: 'Membresía eliminada' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/membresias/categorias/todas
router.get('/categorias/todas', auth, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM categorias_membresia ORDER BY orden');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/membresias/categorias
router.post('/categorias', auth, esAdmin, async (req, res) => {
  try {
    const { nombre, descripcion, orden } = req.body;
    if (!nombre) return res.status(400).json({ error: 'Nombre requerido' });
    const { rows } = await db.query('INSERT INTO categorias_membresia (nombre, descripcion, orden) VALUES ($1,$2,$3) RETURNING *', [nombre, descripcion, orden || 0]);
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
