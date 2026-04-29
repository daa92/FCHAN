const db = require('../config/db');

class Farm {

  // Get all farms belonging to a user
  static async findByUserId(userId) {
    const [rows] = await db.execute(
      'SELECT * FROM farms WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    return rows;
  }

  // Get a single farm by id
  static async findById(id) {
    const [rows] = await db.execute(
      'SELECT * FROM farms WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  }

  // Create a new farm
  static async create({ user_id, name, description, country, city, latitude, longitude }) {
    const [result] = await db.execute(
      `INSERT INTO farms 
       (user_id, name, description, country, city, latitude, longitude) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [user_id, name, description || null, country || null, city || null, latitude || null, longitude || null]
    );
    return result.insertId;
  }

  // Update a farm
  static async update(id, { name, description, country, city, latitude, longitude }) {
    const [result] = await db.execute(
      `UPDATE farms SET 
       name = ?, description = ?, country = ?, 
       city = ?, latitude = ?, longitude = ?
       WHERE id = ?`,
      [name, description || null, country || null, city || null, latitude || null, longitude || null, id]
    );
    return result.affectedRows;
  }

  // Delete a farm
  static async delete(id) {
    const [result] = await db.execute(
      'DELETE FROM farms WHERE id = ?',
      [id]
    );
    return result.affectedRows;
  }

}

module.exports = Farm;
