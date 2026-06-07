const db = require('../config/db');

class Sensor {

  // Get all sensors in a zone
  static async findByZoneId(zoneId) {
    const [rows] = await db.execute(
      'SELECT * FROM sensors WHERE zone_id = ? ORDER BY created_at DESC',
      [zoneId]
    );
    return rows;
  }

  // Get a single sensor by id
  static async findById(id) {
    const [rows] = await db.execute(
      'SELECT * FROM sensors WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  }

  // Find sensor by api_key (used by Arduino/ESP32)
  static async findByApiKey(apiKey) {
    const [rows] = await db.execute(
      'SELECT * FROM sensors WHERE api_key = ? AND is_active = TRUE',
      [apiKey]
    );
    return rows[0] || null;
  }

  // Create a new sensor
  static async create({ zone_id, name, type, unit, connection_type, api_key }) {
    const [result] = await db.execute(
      `INSERT INTO sensors 
       (zone_id, name, type, unit, connection_type, api_key) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        zone_id, name, type,
        unit || null,
        connection_type || 'manual',
        api_key || null
      ]
    );
    return result.insertId;
  }

  // Update a sensor
  static async update(id, { name, type, unit, connection_type, is_active }) {
    const [result] = await db.execute(
      `UPDATE sensors SET 
       name = ?, type = ?, unit = ?,
       connection_type = ?, is_active = ?
       WHERE id = ?`,
      [name, type, unit || null, connection_type, is_active, id]
    );
    return result.affectedRows;
  }

  // Update last seen (called every time sensor sends data)
  static async updateLastSeen(id) {
    await db.execute(
      'UPDATE sensors SET last_seen_at = NOW() WHERE id = ?',
      [id]
    );
  }

  // Delete a sensor
  static async delete(id) {
    const [result] = await db.execute(
      'DELETE FROM sensors WHERE id = ?',
      [id]
    );
    return result.affectedRows;
  }

  // Get all inactive sensors (not seen in last 30 minutes)
  static async findInactive() {
    const [rows] = await db.execute(
      `SELECT * FROM sensors 
       WHERE is_active = TRUE 
       AND last_seen_at IS NOT NULL
       AND last_seen_at < DATE_SUB(NOW(), INTERVAL 30 MINUTE)`
    );
    return rows;
  }

}

module.exports = Sensor;
