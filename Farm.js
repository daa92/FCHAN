const db = require('../config/db');

class Farm {

  // Get all farms belonging to a user
  // Get all farms owned by user OR where user is an accepted collaborator
  static async findByUserId(userId) {
    const [rows] = await db.execute(
      `SELECT f.*, 
              CASE WHEN f.user_id = ? THEN 'owner' ELSE c.role END AS access_role,
              CASE WHEN f.user_id = ? THEN NULL ELSE c.role END AS collab_role
       FROM farms f
       LEFT JOIN collaborators c ON c.farm_id = f.id AND c.user_id = ? AND c.status = 'accepted'
       WHERE f.user_id = ? OR (c.user_id = ? AND c.status = 'accepted')
       ORDER BY f.created_at DESC`,
      [userId, userId, userId, userId, userId]
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
  static async create({ user_id, name, description, country, city, latitude, longitude, image_data }) {
    const [result] = await db.execute(
      `INSERT INTO farms 
       (user_id, name, description, country, city, latitude, longitude, image_data) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [user_id, name, description || null, country || null, city || null, latitude || null, longitude || null, image_data || null]
    );
    return result.insertId;
  }

  // Update a farm
  static async update(id, { name, description, country, city, latitude, longitude, image_data }) {
    const [result] = await db.execute(
      `UPDATE farms SET 
       name = ?, description = ?, country = ?, 
       city = ?, latitude = ?, longitude = ?, image_data = ?, image_data = ?
       WHERE id = ?`,
      [name, description || null, country || null, city || null, latitude || null, longitude || null, image_data !== undefined ? image_data : null, id]
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
