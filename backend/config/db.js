const mysql  = require('mysql2');
const fs     = require('fs');
const path   = require('path');
require('dotenv').config();

// ── SSL Configuration ─────────────────────────────
const sslConfig = process.env.DB_SSL === 'true' ? {
  ssl: {
    ...(process.env.DB_SSL_CA_CONTENT
      ? { ca: process.env.DB_SSL_CA_CONTENT }
      : process.env.DB_SSL_CA
        ? { ca: fs.readFileSync(path.resolve(process.cwd(), process.env.DB_SSL_CA)) }
        : {}),
    rejectUnauthorized: process.env.NODE_ENV !== 'production'
  }
} : {};

// ── Connection Pool ───────────────────────────────
const pool = mysql.createPool({
  host:    process.env.DB_HOST,
  port:    parseInt(process.env.DB_PORT) || 3306,
  user:    process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  ...sslConfig
});

const db = pool.promise();

// ── Test Connection ───────────────────────────────
db.getConnection()
  .then(connection => {
    console.log('  TiDB Cloud connected successfully');
    connection.release();
  })
  .catch(err => {
    console.error('  Database connection failed:', err.message);
  });

module.exports = db;
