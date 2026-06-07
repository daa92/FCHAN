const db = require('../config/db');

class User {

  // Find a user by email
  static async findByEmail(email) {
    const [rows] = await db.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    return rows[0] || null;
  }

  // Find a user by id
  static async findById(id) {
    const [rows] = await db.execute(
      'SELECT id, name, email, role, email_verified, created_at FROM users WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  }

  // Create a new user
  static async create({ name, email, password, role = 'farmer' }) {
    const [result] = await db.execute(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name, email, password, role]
    );
    return result.insertId;
  }

  // Update reset token
  static async setResetToken(email, token, expires) {
    await db.execute(
      'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE email = ?',
      [token, expires, email]
    );
  }

  // Find user by reset token
  static async findByResetToken(token) {
    const [rows] = await db.execute(
      'SELECT * FROM users WHERE reset_token = ? AND reset_token_expires > NOW()',
      [token]
    );
    return rows[0] || null;
  }

  // Update password
  static async updatePassword(id, hashedPassword) {
    await db.execute(
      'UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?',
      [hashedPassword, id]
    );
  }

  // Verify email
  static async verifyEmail(id) {
    await db.execute(
      'UPDATE users SET email_verified = TRUE WHERE id = ?',
      [id]
    );
  }
  static async deleteAccount(id) {
   const [result] = await db.execute(
     'DELETE FROM users WHERE id = ?',
     [id]
   );
   return result.affectedRows;
  }

}

module.exports = User;
