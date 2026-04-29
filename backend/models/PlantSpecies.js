const db = require('../config/db');

class PlantSpecies {

  // Get all built-in species
  static async findAll() {
    const [rows] = await db.execute(
      `SELECT * FROM plant_species 
       WHERE is_custom = FALSE 
       ORDER BY common_name ASC`
    );
    return rows;
  }

  // Get all species available to a user
  // (built-in + their own custom ones)
  static async findAvailable(userId) {
    const [rows] = await db.execute(
      `SELECT * FROM plant_species 
       WHERE is_custom = FALSE 
       OR (is_custom = TRUE AND created_by = ?)
       ORDER BY is_custom ASC, common_name ASC`,
      [userId]
    );
    return rows;
  }

  // Get a single species by id
  static async findById(id) {
    const [rows] = await db.execute(
      'SELECT * FROM plant_species WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  }

  // Search species by name
  static async search(query) {
    const [rows] = await db.execute(
      `SELECT * FROM plant_species 
       WHERE name LIKE ? OR common_name LIKE ?
       ORDER BY is_custom ASC, common_name ASC`,
      [`%${query}%`, `%${query}%`]
    );
    return rows;
  }

  // Create a custom species (user-defined)
  static async create({
    name, common_name,
    base_temp, gdd_to_harvest,
    optimal_temp_min, optimal_temp_max,
    optimal_humidity_min, optimal_humidity_max,
    optimal_soil_moisture_min, optimal_soil_moisture_max,
    optimal_ph_min, optimal_ph_max,
    optimal_light_min, optimal_light_max,
    created_by
  }) {
    const [result] = await db.execute(
      `INSERT INTO plant_species (
        name, common_name,
        base_temp, gdd_to_harvest,
        optimal_temp_min, optimal_temp_max,
        optimal_humidity_min, optimal_humidity_max,
        optimal_soil_moisture_min, optimal_soil_moisture_max,
        optimal_ph_min, optimal_ph_max,
        optimal_light_min, optimal_light_max,
        is_custom, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, ?)`,
      [
        name.toLowerCase().trim(),
        common_name || name,
        base_temp, gdd_to_harvest,
        optimal_temp_min || null,
        optimal_temp_max || null,
        optimal_humidity_min || null,
        optimal_humidity_max || null,
        optimal_soil_moisture_min || null,
        optimal_soil_moisture_max || null,
        optimal_ph_min || null,
        optimal_ph_max || null,
        optimal_light_min || null,
        optimal_light_max || null,
        created_by
      ]
    );
    return result.insertId;
  }

  // Update a custom species
  static async update(id, {
    common_name,
    base_temp, gdd_to_harvest,
    optimal_temp_min, optimal_temp_max,
    optimal_humidity_min, optimal_humidity_max,
    optimal_soil_moisture_min, optimal_soil_moisture_max,
    optimal_ph_min, optimal_ph_max,
    optimal_light_min, optimal_light_max
  }) {
    await db.execute(
      `UPDATE plant_species SET
        common_name = ?,
        base_temp = ?, gdd_to_harvest = ?,
        optimal_temp_min = ?, optimal_temp_max = ?,
        optimal_humidity_min = ?, optimal_humidity_max = ?,
        optimal_soil_moisture_min = ?, optimal_soil_moisture_max = ?,
        optimal_ph_min = ?, optimal_ph_max = ?,
        optimal_light_min = ?, optimal_light_max = ?
       WHERE id = ? AND is_custom = TRUE`,
      [
        common_name,
        base_temp, gdd_to_harvest,
        optimal_temp_min || null,
        optimal_temp_max || null,
        optimal_humidity_min || null,
        optimal_humidity_max || null,
        optimal_soil_moisture_min || null,
        optimal_soil_moisture_max || null,
        optimal_ph_min || null,
        optimal_ph_max || null,
        optimal_light_min || null,
        optimal_light_max || null,
        id
      ]
    );
  }

  // Delete a custom species
  static async delete(id) {
    await db.execute(
      'DELETE FROM plant_species WHERE id = ? AND is_custom = TRUE',
      [id]
    );
  }

}

module.exports = PlantSpecies;
