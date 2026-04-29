const PlantSpecies = require('../models/PlantSpecies');

// GET /api/species
const getAllSpecies = async (req, res) => {
  try {
    const species = await PlantSpecies.findAvailable(req.user.id);
    return res.status(200).json({ success: true, species });
  } catch (err) {
    console.error('GetAllSpecies error:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// GET /api/species/search?q=tomato
const searchSpecies = async (req, res) => {
  try {
    const query = req.query.q || '';
    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required. Use ?q=plantname'
      });
    }
    const species = await PlantSpecies.search(query);
    return res.status(200).json({ success: true, species });
  } catch (err) {
    console.error('SearchSpecies error:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// GET /api/species/:id
const getSpecies = async (req, res) => {
  try {
    const species = await PlantSpecies.findById(req.params.id);
    if (!species) {
      return res.status(404).json({
        success: false,
        message: 'Species not found.'
      });
    }
    return res.status(200).json({ success: true, species });
  } catch (err) {
    console.error('GetSpecies error:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// POST /api/species
const createSpecies = async (req, res) => {
  try {
    const {
      name, common_name,
      base_temp, gdd_to_harvest,
      optimal_temp_min, optimal_temp_max,
      optimal_humidity_min, optimal_humidity_max,
      optimal_soil_moisture_min, optimal_soil_moisture_max,
      optimal_ph_min, optimal_ph_max,
      optimal_light_min, optimal_light_max
    } = req.body;

    if (!name || !base_temp || !gdd_to_harvest) {
      return res.status(400).json({
        success: false,
        message: 'name, base_temp and gdd_to_harvest are required.'
      });
    }

    const id = await PlantSpecies.create({
      name, common_name,
      base_temp, gdd_to_harvest,
      optimal_temp_min, optimal_temp_max,
      optimal_humidity_min, optimal_humidity_max,
      optimal_soil_moisture_min, optimal_soil_moisture_max,
      optimal_ph_min, optimal_ph_max,
      optimal_light_min, optimal_light_max,
      created_by: req.user.id
    });

    const species = await PlantSpecies.findById(id);
    return res.status(201).json({
      success: true,
      message: 'Custom species created.',
      species
    });
  } catch (err) {
    console.error('CreateSpecies error:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// PUT /api/species/:id
const updateSpecies = async (req, res) => {
  try {
    const species = await PlantSpecies.findById(req.params.id);
    if (!species) {
      return res.status(404).json({
        success: false, message: 'Species not found.'
      });
    }
    if (!species.is_custom || species.created_by !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only edit your own custom species.'
      });
    }
    await PlantSpecies.update(req.params.id, req.body);
    const updated = await PlantSpecies.findById(req.params.id);
    return res.status(200).json({
      success: true,
      message: 'Species updated.',
      species: updated
    });
  } catch (err) {
    console.error('UpdateSpecies error:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// DELETE /api/species/:id
const deleteSpecies = async (req, res) => {
  try {
    const species = await PlantSpecies.findById(req.params.id);
    if (!species) {
      return res.status(404).json({
        success: false, message: 'Species not found.'
      });
    }
    if (!species.is_custom || species.created_by !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own custom species.'
      });
    }
    await PlantSpecies.delete(req.params.id);
    return res.status(200).json({
      success: true, message: 'Species deleted.'
    });
  } catch (err) {
    console.error('DeleteSpecies error:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

module.exports = {
  getAllSpecies, searchSpecies, getSpecies,
  createSpecies, updateSpecies, deleteSpecies
};
