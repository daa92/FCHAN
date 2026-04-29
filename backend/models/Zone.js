const db = require('../config/db');

class Zone {

  // Get all zones belonging to a farm
  static async findByFarmId(farmId) {
    const [rows] = await db.execute(
      'SELECT * FROM zones WHERE farm_id = ? ORDER BY created_at DESC',
      [farmId]
    );
    return rows;
  }

  // Get a single zone by id
  static async findById(id) {
    const [rows] = await db.execute(
      'SELECT * FROM zones WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  }

  // Create a new zone
  static async create({ farm_id, name, description, area_sqm }) {
    const [result] = await db.execute(
      `INSERT INTO zones (farm_id, name, description, area_sqm) 
       VALUES (?, ?, ?, ?)`,
      [farm_id, name, description || null, area_sqm || null]
    );
    return result.insertId;
  }

  // Update a zone
  static async update(id, { name, description, area_sqm }) {
    const [result] = await db.execute(
      `UPDATE zones SET name = ?, description = ?, area_sqm = ?
       WHERE id = ?`,
      [name, description || null, area_sqm || null, id]
    );
    return result.affectedRows;
  }

  // Delete a zone
  static async delete(id) {
    const [result] = await db.execute(
      'DELETE FROM zones WHERE id = ?',
      [id]
    );
    return result.affectedRows;
  }

}

module.exports = Zone;
