const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'flync_db',
  user:     process.env.DB_USER || 'flync_user',
  password: process.env.DB_PASSWORD || 'flync_secure_2024',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

pool.on('error', (err) => {
  console.error('Error inesperado en pool PostgreSQL:', err.message);
});

pool.on('connect', () => {
  if (process.env.NODE_ENV !== 'production') {
    console.log('✓ Conexión PostgreSQL establecida');
  }
});

const db = {
  query: (text, params) => pool.query(text, params),
  pool,

  // Transacciones
  transaction: async (fn) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  // Helper para paginación
  paginate: (query, params, page = 1, limit = 20) => {
    const offset = (page - 1) * limit;
    return pool.query(`${query} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, [...params, limit, offset]);
  }
};

module.exports = db;
