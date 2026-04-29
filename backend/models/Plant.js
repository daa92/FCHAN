const db = require('../config/db');

class Plant {

  // Get all plants belonging to a zone
  static async findByZoneId(zoneId) {
    const [rows] = await db.execute(
      'SELECT * FROM plants WHERE zone_id = ? ORDER BY created_at DESC',
      [zoneId]
    );
    return rows;
  }

  // Get a single plant by id
  static async findById(id) {
    const [rows] = await db.execute(
      'SELECT * FROM plants WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  }

  // Create a new plant
  static async create({ zone_id, name, species, variety, quantity, planted_at, growth_stage, notes }) {
    const [result] = await db.execute(
      `INSERT INTO plants 
       (zone_id, name, species, variety, quantity, planted_at, growth_stage, notes) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        zone_id, name,
        species || null, variety || null,
        quantity || 1,
        planted_at || null,
        growth_stage || 'seedling',
        notes || null
      ]
    );
    return result.insertId;
  }

  // Update a plant
  static async update(id, { name, species, variety, quantity, planted_at, expected_harvest_at, growth_stage, notes }) {
    const [result] = await db.execute(
      `UPDATE plants SET 
       name = ?, species = ?, variety = ?, quantity = ?,
       planted_at = ?, expected_harvest_at = ?,
       growth_stage = ?, notes = ?
       WHERE id = ?`,
      [
        name, species || null, variety || null,
        quantity || 1, planted_at || null,
        expected_harvest_at || null,
        growth_stage || 'seedling',
        notes || null, id
      ]
    );
    return result.affectedRows;
  }

  // Delete a plant
  static async delete(id) {
    const [result] = await db.execute(
      'DELETE FROM plants WHERE id = ?',
      [id]
    );
    return result.affectedRows;
  }

}

module.exports = Plant;
