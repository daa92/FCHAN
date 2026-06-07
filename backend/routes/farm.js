const express    = require('express');
const router     = express.Router();
const {
  getFarms, getFarm, createFarm, updateFarm, deleteFarm,
  getZones, createZone, updateZone, deleteZone,
  getPlants, createPlant, updatePlant, deletePlant
} = require('../controllers/farmController');
const { auth }     = require('../middleware/auth');
const farmAccess   = require('../middleware/farmAccess');

router.use(auth);

// ─── FARMS ────────────────────────────────────────────
router.get('/',    getFarms);
router.post('/',   createFarm);
router.get('/:id',    farmAccess(false), getFarm);
router.put('/:id',    farmAccess(true),  updateFarm);
router.delete('/:id', farmAccess(true),  deleteFarm);

// ─── ZONES ────────────────────────────────────────────
router.get( '/:farmId/zones',              farmAccess(false), getZones);
router.post('/:farmId/zones',              farmAccess(true),  createZone);
router.put( '/:farmId/zones/:zoneId',      farmAccess(true),  updateZone);
router.delete('/:farmId/zones/:zoneId',    farmAccess(true),  deleteZone);

// ─── PLANTS ───────────────────────────────────────────
router.get(   '/:farmId/zones/:zoneId/plants',            farmAccess(false), getPlants);
router.post(  '/:farmId/zones/:zoneId/plants',            farmAccess(true),  createPlant);
router.put(   '/:farmId/zones/:zoneId/plants/:plantId',   farmAccess(true),  updatePlant);
router.delete('/:farmId/zones/:zoneId/plants/:plantId',   farmAccess(true),  deletePlant);

module.exports = router;
