const db = require('../config/db');

class Alert {

  // Get all alerts for a farm
  static async findByFarmId(farmId, limit = 50) {
    const [rows] = await db.execute(
      `SELECT * FROM alerts 
       WHERE farm_id = ? 
       ORDER BY created_at DESC 
       LIMIT ${parseInt(limit)}`,
      [farmId]
    );
    return rows;
  }

  // Get unread alerts for a farm
  static async findUnread(farmId) {
    const [rows] = await db.execute(
      `SELECT * FROM alerts 
       WHERE farm_id = ? AND is_read = FALSE
       ORDER BY created_at DESC`,
      [farmId]
    );
    return rows;
  }

  // Get a single alert
  static async findById(id) {
    const [rows] = await db.execute(
      'SELECT * FROM alerts WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  }

  // Create a new alert
  static async create({ farm_id, zone_id, plant_id, sensor_id, type, severity, message }) {
    const [result] = await db.execute(
      `INSERT INTO alerts 
       (farm_id, zone_id, plant_id, sensor_id, type, severity, message)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        farm_id,
        zone_id || null,
        plant_id || null,
        sensor_id || null,
        type, severity, message
      ]
    );
    return result.insertId;
  }

  // Mark alert as read
  static async markAsRead(id) {
    await db.execute(
      'UPDATE alerts SET is_read = TRUE WHERE id = ?',
      [id]
    );
  }

  // Mark all alerts as read for a farm
  static async markAllAsRead(farmId) {
    await db.execute(
      'UPDATE alerts SET is_read = TRUE WHERE farm_id = ?',
      [farmId]
    );
  }

  // Mark alert as resolved
  static async markAsResolved(id) {
    await db.execute(
      'UPDATE alerts SET is_resolved = TRUE WHERE id = ?',
      [id]
    );
  }

  // Check if similar alert already exists (avoid duplicates)
  static async findRecent(farmId, type, sensorId, minutesAgo = 30) {
    const [rows] = await db.execute(
      `SELECT * FROM alerts 
       WHERE farm_id = ? 
       AND type = ? 
       AND sensor_id = ?
       AND is_resolved = FALSE
       AND created_at >= DATE_SUB(NOW(), INTERVAL ? MINUTE)`,
      [farmId, type, sensorId, minutesAgo]
    );
    return rows[0] || null;
  }

  // Count unread alerts for a farm
  static async countUnread(farmId) {
    const [rows] = await db.execute(
      'SELECT COUNT(*) as count FROM alerts WHERE farm_id = ? AND is_read = FALSE',
      [farmId]
    );
    return rows[0].count;
  }

}

module.exports = Alert;
