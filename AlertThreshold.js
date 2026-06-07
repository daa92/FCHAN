const db = require('../config/db');

class AlertThreshold {

  // Get all thresholds for a zone
  static async findByZoneId(zoneId) {
    const [rows] = await db.execute(
      'SELECT * FROM alert_thresholds WHERE zone_id = ?',
      [zoneId]
    );
    return rows;
  }

  // Get threshold for a specific sensor type in a zone
  static async findByZoneAndType(zoneId, sensorType) {
    const [rows] = await db.execute(
      'SELECT * FROM alert_thresholds WHERE zone_id = ? AND sensor_type = ?',
      [zoneId, sensorType]
    );
    return rows[0] || null;
  }

  // Create a threshold
  static async create({ zone_id, sensor_type, min_value, max_value }) {
    const [result] = await db.execute(
      `INSERT INTO alert_thresholds (zone_id, sensor_type, min_value, max_value)
       VALUES (?, ?, ?, ?)`,
      [zone_id, sensor_type, min_value || null, max_value || null]
    );
    return result.insertId;
  }

  // Update a threshold
  static async update(id, { min_value, max_value }) {
    await db.execute(
      'UPDATE alert_thresholds SET min_value = ?, max_value = ? WHERE id = ?',
      [min_value || null, max_value || null, id]
    );
  }

  // Delete a threshold
  static async delete(id) {
    await db.execute(
      'DELETE FROM alert_thresholds WHERE id = ?',
      [id]
    );
  }

}

module.exports = AlertThreshold;
