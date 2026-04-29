const express = require('express');
const router = express.Router();
const {
  getFarms, getFarm, createFarm, updateFarm, deleteFarm,
  getZones, createZone, updateZone, deleteZone,
  getPlants, createPlant, updatePlant, deletePlant
} = require('../controllers/farmController');
const { auth } = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// ─── FARMS ────────────────────────────────────────────
router.get('/', getFarms);
router.get('/:id', getFarm);
router.post('/', createFarm);
router.put('/:id', updateFarm);
router.delete('/:id', deleteFarm);

// ─── ZONES ────────────────────────────────────────────
router.get('/:farmId/zones', getZones);
router.post('/:farmId/zones', createZone);
router.put('/:farmId/zones/:zoneId', updateZone);
router.delete('/:farmId/zones/:zoneId', deleteZone);

// ─── PLANTS ───────────────────────────────────────────
router.get('/:farmId/zones/:zoneId/plants', getPlants);
router.post('/:farmId/zones/:zoneId/plants', createPlant);
router.put('/:farmId/zones/:zoneId/plants/:plantId', updatePlant);
router.delete('/:farmId/zones/:zoneId/plants/:plantId', deletePlant);

module.exports = router;
