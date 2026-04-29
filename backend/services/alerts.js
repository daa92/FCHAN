const cron = require('node-cron');
const db = require('../config/db');
const Alert = require('../models/Alert');
const Sensor = require('../models/Sensor');
const Reading = require('../models/Reading');
const AlertThreshold = require('../models/AlertThreshold');

// ─── ALERT MESSAGES ───────────────────────────────────
const getAlertMessage = (sensorType, value, unit, min, max) => {
  if (min !== null && value < min) {
    return `${sensorType.replace('_', ' ')} is too low: ${value}${unit || ''}. Minimum is ${min}${unit || ''}.`;
  }
  if (max !== null && value > max) {
    return `${sensorType.replace('_', ' ')} is too high: ${value}${unit || ''}. Maximum is ${max}${unit || ''}.`;
  }
  return null;
};

const getSeverity = (sensorType, value, min, max) => {
  if (sensorType === 'temperature') {
    const diff = value < min ? min - value : value - max;
    if (diff > 10) return 'critical';
    if (diff > 5) return 'warning';
    return 'info';
  }
  if (sensorType === 'soil_moisture') {
    const diff = value < min ? min - value : value - max;
    if (diff > 30) return 'critical';
    if (diff > 15) return 'warning';
    return 'info';
  }
  return 'warning';
};

// ─── MAIN ALERT CHECK FUNCTION ────────────────────────
const checkAlerts = async (io) => {
  try {
    console.log('Running alerts check...');

    // Get all active sensors with their zone and farm info
    const [sensors] = await db.execute(
      `SELECT s.*, z.farm_id, z.id as zone_id
       FROM sensors s
       JOIN zones z ON s.zone_id = z.id
       WHERE s.is_active = TRUE`
    );

    for (const sensor of sensors) {

      // 1. Check if sensor is offline
      if (sensor.last_seen_at) {
        const lastSeen = new Date(sensor.last_seen_at);
        const minutesAgo = (Date.now() - lastSeen.getTime()) / 60000;

        if (minutesAgo > 30) {
          // Check if we already sent this alert recently
          const existing = await Alert.findRecent(
            sensor.farm_id, 'sensor_offline', sensor.id, 60
          );

          if (!existing) {
            const alertId = await Alert.create({
              farm_id: sensor.farm_id,
              zone_id: sensor.zone_id,
              sensor_id: sensor.id,
              type: 'sensor_offline',
              severity: 'warning',
              message: `Sensor "${sensor.name}" has not reported data in ${Math.round(minutesAgo)} minutes.`
            });

            // Emit real-time alert
            if (io) {
              io.emit(`farm:${sensor.farm_id}:alert`, {
                type: 'sensor_offline',
                message: `Sensor "${sensor.name}" is offline.`
              });
            }

            console.log(`Offline alert created for sensor: ${sensor.name}`);
          }
        }
      }

      // 2. Check threshold violations
      const latest = await Reading.findLatest(sensor.id);
      if (!latest) continue;

      const threshold = await AlertThreshold.findByZoneAndType(
        sensor.zone_id, sensor.type
      );
      if (!threshold) continue;

      const value = parseFloat(latest.value);
      const min = threshold.min_value !== null ? parseFloat(threshold.min_value) : null;
      const max = threshold.max_value !== null ? parseFloat(threshold.max_value) : null;

      const message = getAlertMessage(sensor.type, value, sensor.unit, min, max);

      if (message) {
        // Check if similar alert already exists
        const alertType = value < min ? `${sensor.type}_low` : `${sensor.type}_high`;
        const existing = await Alert.findRecent(
          sensor.farm_id, alertType, sensor.id, 30
        );

        if (!existing) {
          const severity = getSeverity(sensor.type, value, min, max);

          await Alert.create({
            farm_id: sensor.farm_id,
            zone_id: sensor.zone_id,
            sensor_id: sensor.id,
            type: alertType,
            severity,
            message
          });

          // Emit real-time alert
          if (io) {
            io.emit(`farm:${sensor.farm_id}:alert`, {
              type: alertType,
              severity,
              message
            });
          }

          console.log(`Alert created: ${message}`);
        }
      }
    }

    console.log('Alerts check complete.');

  } catch (err) {
    console.error('Alerts check error:', err.message);
  }
};

// ─── START THE CRON JOB ───────────────────────────────
const startAlertsEngine = (io) => {
  // Run every 5 minutes
  cron.schedule('*/5 * * * *', () => {
    checkAlerts(io);
  });

  console.log('Alerts engine started (runs every 5 minutes)');
};

module.exports = { startAlertsEngine, checkAlerts };
