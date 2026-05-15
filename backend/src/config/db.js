const { Pool } = require("pg");
let poolConfig;
if (process.env.DATABASE_URL) {
  poolConfig = { connectionString: process.env.DATABASE_URL, ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false };
} else {
  poolConfig = { host: process.env.DB_HOST||"localhost", port: parseInt(process.env.DB_PORT)||5432, database: process.env.DB_NAME||"flync_db", user: process.env.DB_USER||"flync_user", password: process.env.DB_PASSWORD||"flync_secure_2024", ssl: false };
}
const pool = new Pool({ ...poolConfig, max: 20, idleTimeoutMillis: 30000, connectionTimeoutMillis: 5000 });
pool.on("error", (err) => console.error("Error pool:", err.message));
const db = { query: (t,p) => pool.query(t,p), pool, transaction: async (fn) => { const c = await pool.connect(); try { await c.query("BEGIN"); const r = await fn(c); await c.query("COMMIT"); return r; } catch(e) { await c.query("ROLLBACK"); throw e; } finally { c.release(); } } };
module.exports = db;