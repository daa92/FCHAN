const mysql = require('mysql2');
require('dotenv').config();

// Create a connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  waitForConnections: true,
  connectionLimit: 10, // we can adjust it
  queueLimit: 0
});

// Convert pool to use promises (so we can use async/await)
const db = pool.promise();

// Test the connection
db.getConnection()
  .then(connection => {
    console.log('MySQL connected successfully');
    connection.release();
  })
  .catch(err => {
    console.error('MySQL connection failed:', err.message);
  });

module.exports = db;
