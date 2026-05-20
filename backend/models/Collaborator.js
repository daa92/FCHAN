const db = require('../config/db');

class Collaborator {

  static async findByFarm(farmId) {
    const [rows] = await db.execute(
      `SELECT c.*, u.name as user_name
       FROM collaborators c
       LEFT JOIN users u ON c.user_id = u.id
       WHERE c.farm_id = ?
       ORDER BY c.created_at DESC`,
      [farmId]
    );
    return rows;
  }

  static async findByToken(token) {
    const [rows] = await db.execute(
      `SELECT c.*, f.name as farm_name, u.name as invited_by_name
       FROM collaborators c
       JOIN farms f ON c.farm_id = f.id
       JOIN users u ON c.invited_by = u.id
       WHERE c.token = ? AND c.token_expires > NOW()`,
      [token]
    );
    return rows[0] || null;
  }

  static async findByUserAndFarm(userId, farmId) {
    const [rows] = await db.execute(
      `SELECT * FROM collaborators
       WHERE user_id = ? AND farm_id = ?
       AND status = 'accepted'`,
      [userId, farmId]
    );
    return rows[0] || null;
  }

  static async create({ farm_id, invited_by, invited_email,
                        role, token, token_expires }) {
    const [result] = await db.execute(
      `INSERT INTO collaborators
       (farm_id, invited_by, invited_email, role, token, token_expires)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [farm_id, invited_by, invited_email, role, token, token_expires]
    );
    return result.insertId;
  }

  static async accept(token, userId) {
    await db.execute(
      `UPDATE collaborators
       SET status = 'accepted', user_id = ?
       WHERE token = ?`,
      [userId, token]
    );
  }

  static async decline(token) {
    await db.execute(
      `UPDATE collaborators SET status = 'declined' WHERE token = ?`,
      [token]
    );
  }

  static async remove(id) {
    await db.execute('DELETE FROM collaborators WHERE id = ?', [id]);
  }
}

module.exports = Collaborator;
