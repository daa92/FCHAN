const db = require('../config/db');
const Reading = require('../models/Reading');
const PlantSpecies = require('../models/PlantSpecies');

// ─── HELPER: CALCULATE DAILY GDD ─────────────────────
const calculateDailyGDD = (maxTemp, minTemp, baseTemp) => {
  const avg = (maxTemp + minTemp) / 2;
  return Math.max(0, avg - baseTemp);
};

// ─── HELPER: SOIL MOISTURE PENALTY ───────────────────
const getSoilMoisturePenalty = (moisture, optMin, optMax) => {
  if (moisture === null) return 1.0;
  const min = optMin || 60;
  const max = optMax || 80;
  if (moisture >= min && moisture <= max) return 1.0;
  if (moisture >= min - 20 && moisture < min) return 0.8;
  if (moisture > max && moisture <= max + 10) return 0.9;
  if (moisture >= min - 40 && moisture < min - 20) return 0.6;
  if (moisture > max + 10) return 0.7;
  return 0.4;
};

// ─── HELPER: INDIVIDUAL HEALTH SCORE ─────────────────
const getHealthScore = (value, min, max) => {
  if (value === null || min === null || max === null) return null;
  const range = max - min;
  if (value >= min && value <= max) return 100;
  const deviation = value < min
    ? ((min - value) / range) * 100
    : ((value - max) / range) * 100;
  if (deviation <= 10) return 85;
  if (deviation <= 25) return 65;
  if (deviation <= 50) return 40;
  return 15;
};

// ─── MAIN FORECAST FUNCTION ───────────────────────────
const getForecast = async (plant, sensors) => {
  try {

    // 1. Get species data from database
    let species = null;
    if (plant.species_id) {
      species = await PlantSpecies.findById(plant.species_id);
    }

    // If no species linked, try to find by name
    if (!species && plant.species) {
      const results = await PlantSpecies.search(plant.species);
      if (results.length > 0) species = results[0];
    }

    // If still no species, return error asking user to define it
    if (!species) {
      return {
        error: 'Plant species not recognized.',
        action_required: 'Please link this plant to a species or create a custom species with its growth parameters.',
        plant_id: plant.id,
        plant_name: plant.name
      };
    }

    const plantedAt = plant.planted_at ? new Date(plant.planted_at) : null;
    if (!plantedAt) {
      return {
        error: 'Planting date not set. Cannot calculate forecast.',
        plant_id: plant.id
      };
    }
    // If no planting date, use today as estimate
    /*const plantedAt = plant.planted_at
      ? new Date(plant.planted_at)
      : new Date();

    const plantedAtNote = !plant.planted_at
      ? 'Planting date not set — using today as estimate'
      : null;*/

    // 2. Get sensor readings averages
    const sensorData = {};
    for (const sensor of sensors) {
      const stats = await Reading.getAverage(sensor.id, 24);
      sensorData[sensor.type] = {
        average: stats.average ? parseFloat(stats.average) : null,
        sensor_id: sensor.id
      };
    }

    // 3. Calculate accumulated GDD
    const tempData = sensorData['temperature'];
    let accumulatedGDD = 0;
    let averageDailyGDD = 0;

    if (tempData && tempData.average !== null) {
      const [tempReadings] = await db.execute(
        `SELECT 
           DATE(recorded_at) as day,
           MAX(value) as max_temp,
           MIN(value) as min_temp
         FROM readings r
         JOIN sensors s ON r.sensor_id = s.id
         WHERE s.type = 'temperature'
         AND s.id = ?
         AND recorded_at >= ?
         GROUP BY day
         ORDER BY day ASC`,
        [tempData.sensor_id, plantedAt]
      );

      if (tempReadings.length > 0) {
        for (const day of tempReadings) {
          const dailyGDD = calculateDailyGDD(
            parseFloat(day.max_temp),
            parseFloat(day.min_temp),
            parseFloat(species.base_temp)
          );
          accumulatedGDD += dailyGDD;
        }
        averageDailyGDD = accumulatedGDD / tempReadings.length;
      } else {
        const estimatedMax = tempData.average + 5;
        const estimatedMin = tempData.average - 5;
        averageDailyGDD = calculateDailyGDD(
          estimatedMax, estimatedMin,
          parseFloat(species.base_temp)
        );
        const daysSincePlanting = Math.floor(
          (Date.now() - plantedAt.getTime()) / (1000 * 60 * 60 * 24)
        );
        accumulatedGDD = averageDailyGDD * daysSincePlanting;
      }
    } else {
      const daysSincePlanting = Math.floor(
        (Date.now() - plantedAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      averageDailyGDD = 10;
      accumulatedGDD = averageDailyGDD * daysSincePlanting;
    }

    // 4. Apply soil moisture penalty
    const moistureData = sensorData['soil_moisture'];
    const moisturePenalty = getSoilMoisturePenalty(
      moistureData ? moistureData.average : null,
      species.optimal_soil_moisture_min,
      species.optimal_soil_moisture_max
    );
    const effectiveDailyGDD = averageDailyGDD * moisturePenalty;

    // 5. Calculate growth percentage
    const growthPercentage = Math.min(
      100,
      Math.round((accumulatedGDD / species.gdd_to_harvest) * 100)
    );

    // 6. Estimate days remaining
    const remainingGDD = Math.max(0, species.gdd_to_harvest - accumulatedGDD);
    const daysRemaining = effectiveDailyGDD > 0
      ? Math.round(remainingGDD / effectiveDailyGDD)
      : null;

    // 7. Estimated harvest date
    const estimatedHarvestDate = daysRemaining !== null
      ? new Date(Date.now() + daysRemaining * 24 * 60 * 60 * 1000)
        .toISOString().split('T')[0]
      : null;

    // 8. Health scores using species-specific optimal ranges
    const healthScores = [];
    const checks = [
      { type: 'temperature', min: species.optimal_temp_min, max: species.optimal_temp_max },
      { type: 'humidity', min: species.optimal_humidity_min, max: species.optimal_humidity_max },
      { type: 'soil_moisture', min: species.optimal_soil_moisture_min, max: species.optimal_soil_moisture_max },
      { type: 'soil_ph', min: species.optimal_ph_min, max: species.optimal_ph_max },
      { type: 'light', min: species.optimal_light_min, max: species.optimal_light_max }
    ];

    for (const check of checks) {
      if (sensorData[check.type] && sensorData[check.type].average !== null) {
        const score = getHealthScore(
          sensorData[check.type].average,
          check.min, check.max
        );
        if (score !== null) healthScores.push(score);
      }
    }

    const healthScore = healthScores.length > 0
      ? Math.round(healthScores.reduce((a, b) => a + b, 0) / healthScores.length)
      : null;

    let healthStatus = 'Unknown';
    if (healthScore !== null) {
      if (healthScore >= 85) healthStatus = 'Excellent';
      else if (healthScore >= 70) healthStatus = 'Good';
      else if (healthScore >= 50) healthStatus = 'Fair';
      else if (healthScore >= 30) healthStatus = 'Poor';
      else healthStatus = 'Critical';
    }

    // 9. Recommendations using species optimal ranges
    const recommendations = [];
    if (moistureData && moistureData.average !== null) {
      if (moistureData.average < (species.optimal_soil_moisture_min || 60)) {
        recommendations.push(`Soil moisture too low (${moistureData.average.toFixed(1)}%). Increase irrigation.`);
      } else if (moistureData.average > (species.optimal_soil_moisture_max || 80)) {
        recommendations.push(`Soil moisture too high (${moistureData.average.toFixed(1)}%). Reduce irrigation.`);
      }
    }
    if (tempData && tempData.average !== null) {
      if (tempData.average > (species.optimal_temp_max || 30)) {
        recommendations.push(`Temperature too high (${tempData.average.toFixed(1)}°C). Consider shading or ventilation.`);
      } else if (tempData.average < species.base_temp) {
        recommendations.push(`Temperature below base (${tempData.average.toFixed(1)}°C). Plant growth has stopped.`);
      }
    }
    if (sensorData['soil_ph'] && sensorData['soil_ph'].average !== null) {
      const ph = sensorData['soil_ph'].average;
      if (ph < (species.optimal_ph_min || 6.0)) {
        recommendations.push(`Soil pH too acidic (${ph.toFixed(1)}). Add lime to increase pH.`);
      } else if (ph > (species.optimal_ph_max || 7.0)) {
        recommendations.push(`Soil pH too alkaline (${ph.toFixed(1)}). Add sulfur to decrease pH.`);
      }
    }

      // Auto-update expected_harvest_at in database
      if (estimatedHarvestDate) {
        await db.execute(
          'UPDATE plants SET expected_harvest_at = ? WHERE id = ?',
          [estimatedHarvestDate, plant.id]
        );
      }
      return {
      plant_id: plant.id,
      plant_name: plant.name,
      species: species.common_name,
      planted_at: plantedAt.toISOString().split('T')[0],
      growth_percentage: growthPercentage,
      accumulated_gdd: Math.round(accumulatedGDD),
      total_gdd_needed: species.gdd_to_harvest,
      average_daily_gdd: Math.round(averageDailyGDD * 10) / 10,
      days_remaining: daysRemaining,
      estimated_harvest_date: estimatedHarvestDate,
      health_score: healthScore,
      health_status: healthStatus,
      moisture_penalty: moisturePenalty,
      current_readings: sensorData,
      recommendations
    };

  } catch (err) {
    console.error('Forecast error:', err.message);
    throw err;
  }
};

module.exports = { getForecast };
