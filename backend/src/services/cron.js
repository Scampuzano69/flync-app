const cron = require('node-cron');
const db = require('../config/db');

// Cada 5 min: limpiar QR tokens expirados
cron.schedule('*/5 * * * *', async () => {
  try {
    const { rowCount } = await db.query("DELETE FROM qr_tokens WHERE expira_en < NOW() - INTERVAL '1 hour'");
    if (rowCount > 0) console.log(`[cron] ${rowCount} QR tokens eliminados`);
  } catch (err) { console.error('[cron] Error limpiando QR tokens:', err.message); }
});

// Cada día a las 00:05: contratos vencidos
cron.schedule('5 0 * * *', async () => {
  try {
    const { rowCount } = await db.query("UPDATE contratos SET estado='vencido' WHERE estado='activo' AND fecha_fin < CURRENT_DATE");
    if (rowCount) console.log(`[cron] ${rowCount} contratos vencidos`);
    // Marcar créditos caducados
    await db.query('UPDATE creditos_usuario SET activo=FALSE WHERE fecha_caducidad < NOW() AND activo=TRUE');
    // Limpiar refresh tokens expirados
    await db.query('DELETE FROM refresh_tokens WHERE expira_en < NOW() - INTERVAL \'7 days\'');
  } catch (err) { console.error('[cron] Error verificando contratos:', err.message); }
});

// Cada día a las 09:00: recordatorios de renovación
cron.schedule('0 9 * * *', async () => {
  try {
    const { rows } = await db.query(`
      SELECT c.id, u.nombre, u.email, m.nombre AS membresia, c.fecha_fin
      FROM contratos c JOIN usuarios u ON u.id=c.usuario_id JOIN membresias m ON m.id=c.membresia_id
      WHERE c.estado='activo' AND c.fecha_fin BETWEEN CURRENT_DATE+6 AND CURRENT_DATE+8`);
    if (rows.length > 0) console.log(`[cron] ${rows.length} recordatorios de renovación pendientes`);
    // Aquí iría el envío de emails/push notifications
  } catch (err) { console.error('[cron] Error recordatorios:', err.message); }
});

console.log('⏰ Cron jobs iniciados');
