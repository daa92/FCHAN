const express = require('express');
const router = express.Router();
const { getPlantForecast } = require('../controllers/forecastController');
const { auth } = require('../middleware/auth');

router.use(auth);

// GET /api/forecast/plant/:plantId
router.get('/plant/:plantId', getPlantForecast);

module.exports = router;
