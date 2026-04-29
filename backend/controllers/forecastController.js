const Plant = require('../models/Plant');
const Sensor = require('../models/Sensor');
const { getForecast } = require('../services/forecast');

// GET /api/forecast/plant/:plantId
const getPlantForecast = async (req, res) => {
  try {
    const plant = await Plant.findById(req.params.plantId);
    if (!plant) {
      return res.status(404).json({
        success: false,
        message: 'Plant not found.'
      });
    }

    // Get all sensors in the same zone
    const sensors = await Sensor.findByZoneId(plant.zone_id);

    // Calculate forecast
    const forecast = await getForecast(plant, sensors);

    return res.status(200).json({
      success: true,
      forecast
    });

  } catch (err) {
    console.error('GetPlantForecast error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error.'
    });
  }
};

module.exports = { getPlantForecast };
