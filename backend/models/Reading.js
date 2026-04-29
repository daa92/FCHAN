const db = require('../config/db');

class Reading {

  // Get all readings for a sensor
  static async findBySensorId(sensorId, limit = 100) {
    const [rows] = await db.execute(
      `SELECT * FROM readings 
       WHERE sensor_id = ? 
       ORDER BY recorded_at DESC 
       LIMIT ${parseInt(limit)}`,
      [sensorId]
    );
    return rows;
  }

  // Get latest reading for a sensor
  static async findLatest(sensorId) {
    const [rows] = await db.execute(
      `SELECT * FROM readings 
       WHERE sensor_id = ? 
       ORDER BY recorded_at DESC 
       LIMIT 1`,
      [sensorId]
    );
    return rows[0] || null;
  }

  // Get readings within a time range
  static async findByTimeRange(sensorId, from, to) {
    const [rows] = await db.execute(
      `SELECT * FROM readings 
       WHERE sensor_id = ? 
       AND recorded_at BETWEEN ? AND ?
       ORDER BY recorded_at ASC`,
      [sensorId, from, to]
    );
    return rows;
  }

  // Create a new reading
  static async create({ sensor_id, value, entered_by, recorded_at }) {
    const [result] = await db.execute(
      `INSERT INTO readings (sensor_id, value, entered_by, recorded_at) 
       VALUES (?, ?, ?, ?)`,
      [
        sensor_id, value,
        entered_by || 'manual',
        recorded_at || new Date()
      ]
    );
    return result.insertId;
  }

  // Get average value for a sensor in last 24 hours
  static async getAverage(sensorId, hours = 24) {
    const [rows] = await db.execute(
      `SELECT AVG(value) as average, 
              MIN(value) as minimum,
              MAX(value) as maximum,
              COUNT(*) as total_readings
       FROM readings 
       WHERE sensor_id = ? 
       AND recorded_at >= DATE_SUB(NOW(), INTERVAL ? HOUR)`,
      [sensorId, hours]
    );
    return rows[0];
  }

  // Get readings grouped by hour (for charts)
  static async getHourlyData(sensorId, hours = 24) {
    const [rows] = await db.execute(
      `SELECT 
         DATE_FORMAT(recorded_at, '%Y-%m-%d %H:00:00') as hour,
         AVG(value) as average,
         MIN(value) as minimum,
         MAX(value) as maximum
       FROM readings 
       WHERE sensor_id = ? 
       AND recorded_at >= DATE_SUB(NOW(), INTERVAL ? HOUR)
       GROUP BY hour
       ORDER BY hour ASC`,
      [sensorId, hours]
    );
    return rows;
  }

}

module.exports = Reading;
