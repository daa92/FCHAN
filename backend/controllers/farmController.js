const Farm = require('../models/Farm');
const Zone = require('../models/Zone');
const Plant = require('../models/Plant');

// ─── FARMS ────────────────────────────────────────────

// GET /api/farms
const getFarms = async (req, res) => {
  try {
    const farms = await Farm.findByUserId(req.user.id);
    return res.status(200).json({ success: true, farms });
  } catch (err) {
    console.error('GetFarms error:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// GET /api/farms/:id
const getFarm = async (req, res) => {
  try {
    const farm = await Farm.findById(req.params.id);
    if (!farm) {
      return res.status(404).json({ success: false, message: 'Farm not found.' });
    }
    // Make sure farm belongs to logged in user
    if (farm.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }
    return res.status(200).json({ success: true, farm });
  } catch (err) {
    console.error('GetFarm error:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// POST /api/farms
const createFarm = async (req, res) => {
  try {
    const { name, description, country, city, latitude, longitude } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Farm name is required.' });
    }
    const farmId = await Farm.create({
      user_id: req.user.id,
      name, description, country, city, latitude, longitude
    });
    const farm = await Farm.findById(farmId);
    return res.status(201).json({ success: true, message: 'Farm created.', farm });
  } catch (err) {
    console.error('CreateFarm error:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// PUT /api/farms/:id
const updateFarm = async (req, res) => {
  try {
    const farm = await Farm.findById(req.params.id);
    if (!farm) {
      return res.status(404).json({ success: false, message: 'Farm not found.' });
    }
    if (farm.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }
    const { name, description, country, city, latitude, longitude } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Farm name is required.' });
    }
    await Farm.update(req.params.id, { name, description, country, city, latitude, longitude });
    const updatedFarm = await Farm.findById(req.params.id);
    return res.status(200).json({ success: true, message: 'Farm updated.', farm: updatedFarm });
  } catch (err) {
    console.error('UpdateFarm error:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// DELETE /api/farms/:id
const deleteFarm = async (req, res) => {
  try {
    const farm = await Farm.findById(req.params.id);
    if (!farm) {
      return res.status(404).json({ success: false, message: 'Farm not found.' });
    }
    if (farm.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }
    await Farm.delete(req.params.id);
    return res.status(200).json({ success: true, message: 'Farm deleted.' });
  } catch (err) {
    console.error('DeleteFarm error:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// ─── ZONES ────────────────────────────────────────────

// GET /api/farms/:farmId/zones
const getZones = async (req, res) => {
  try {
    const farm = await Farm.findById(req.params.farmId);
    if (!farm) {
      return res.status(404).json({ success: false, message: 'Farm not found.' });
    }
    if (farm.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }
    const zones = await Zone.findByFarmId(req.params.farmId);
    return res.status(200).json({ success: true, zones });
  } catch (err) {
    console.error('GetZones error:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// POST /api/farms/:farmId/zones
const createZone = async (req, res) => {
  try {
    const farm = await Farm.findById(req.params.farmId);
    if (!farm) {
      return res.status(404).json({ success: false, message: 'Farm not found.' });
    }
    if (farm.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }
    const { name, description, area_sqm } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Zone name is required.' });
    }
    const zoneId = await Zone.create({
      farm_id: req.params.farmId,
      name, description, area_sqm
    });
    const zone = await Zone.findById(zoneId);
    return res.status(201).json({ success: true, message: 'Zone created.', zone });
  } catch (err) {
    console.error('CreateZone error:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// PUT /api/farms/:farmId/zones/:zoneId
const updateZone = async (req, res) => {
  try {
    const zone = await Zone.findById(req.params.zoneId);
    if (!zone) {
      return res.status(404).json({ success: false, message: 'Zone not found.' });
    }
    const { name, description, area_sqm } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Zone name is required.' });
    }
    await Zone.update(req.params.zoneId, { name, description, area_sqm });
    const updatedZone = await Zone.findById(req.params.zoneId);
    return res.status(200).json({ success: true, message: 'Zone updated.', zone: updatedZone });
  } catch (err) {
    console.error('UpdateZone error:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// DELETE /api/farms/:farmId/zones/:zoneId
const deleteZone = async (req, res) => {
  try {
    const zone = await Zone.findById(req.params.zoneId);
    if (!zone) {
      return res.status(404).json({ success: false, message: 'Zone not found.' });
    }
    await Zone.delete(req.params.zoneId);
    return res.status(200).json({ success: true, message: 'Zone deleted.' });
  } catch (err) {
    console.error('DeleteZone error:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// ─── PLANTS ───────────────────────────────────────────

// GET /api/farms/:farmId/zones/:zoneId/plants
const getPlants = async (req, res) => {
  try {
    const plants = await Plant.findByZoneId(req.params.zoneId);
    return res.status(200).json({ success: true, plants });
  } catch (err) {
    console.error('GetPlants error:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// POST /api/farms/:farmId/zones/:zoneId/plants
const createPlant = async (req, res) => {
  try {
    const { name, species, variety, quantity, planted_at, growth_stage, notes } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Plant name is required.' });
    }
    const plantId = await Plant.create({
      zone_id: req.params.zoneId,
      name, species, variety, quantity,
      planted_at, growth_stage, notes
    });
    const plant = await Plant.findById(plantId);
    return res.status(201).json({ success: true, message: 'Plant created.', plant });
  } catch (err) {
    console.error('CreatePlant error:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// PUT /api/farms/:farmId/zones/:zoneId/plants/:plantId
const updatePlant = async (req, res) => {
  try {
    const plant = await Plant.findById(req.params.plantId);
    if (!plant) {
      return res.status(404).json({ success: false, message: 'Plant not found.' });
    }
    
    const { name, species_id, species, variety, quantity, planted_at, expected_harvest_at, growth_stage, notes } = req.body;
    //const { name, species, variety, quantity, planted_at, expected_harvest_at, growth_stage, notes } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Plant name is required.' });
    }
    await Plant.update(req.params.plantId, {
  	name, species_id, species, variety, quantity,
  	planted_at, expected_harvest_at,
  	growth_stage, notes
    });
    /*await Plant.update(req.params.plantId, {
      name, species, variety, quantity,
      planted_at, expected_harvest_at,
      growth_stage, notes
    });*/
    const updatedPlant = await Plant.findById(req.params.plantId);
    return res.status(200).json({ success: true, message: 'Plant updated.', plant: updatedPlant });
  } catch (err) {
    console.error('UpdatePlant error:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// DELETE /api/farms/:farmId/zones/:zoneId/plants/:plantId
const deletePlant = async (req, res) => {
  try {
    const plant = await Plant.findById(req.params.plantId);
    if (!plant) {
      return res.status(404).json({ success: false, message: 'Plant not found.' });
    }
    await Plant.delete(req.params.plantId);
    return res.status(200).json({ success: true, message: 'Plant deleted.' });
  } catch (err) {
    console.error('DeletePlant error:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

module.exports = {
  getFarms, getFarm, createFarm, updateFarm, deleteFarm,
  getZones, createZone, updateZone, deleteZone,
  getPlants, createPlant, updatePlant, deletePlant
};


// All this structure is just like authController.js
