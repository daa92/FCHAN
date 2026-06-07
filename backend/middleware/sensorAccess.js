const db = require('../config/db');

const sensorAccess = (requireWrite = false) => async (req, res, next) => {
  try {
    const userId   = req.user.id;
    const sensorId = req.params.id;
    const zoneId   = req.params.zoneId;

    let farmQuery, farmParams;
    if (sensorId) {
      farmQuery = `SELECT f.user_id, c.role, c.status
                   FROM sensors s
                   JOIN zones z   ON z.id = s.zone_id
                   JOIN farms f   ON f.id = z.farm_id
                   LEFT JOIN collaborators c ON c.farm_id = f.id AND c.user_id = ? AND c.status = 'accepted'
                   WHERE s.id = ?`;
      farmParams = [userId, sensorId];
    } else {
      farmQuery = `SELECT f.user_id, c.role, c.status
                   FROM zones z
                   JOIN farms f ON f.id = z.farm_id
                   LEFT JOIN collaborators c ON c.farm_id = f.id AND c.user_id = ? AND c.status = 'accepted'
                   WHERE z.id = ?`;
      farmParams = [userId, zoneId];
    }

    const [rows] = await db.execute(farmQuery, farmParams);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Resource not found.' });

    const row     = rows[0];
    const isOwner = parseInt(row.user_id) === parseInt(userId);
    const role    = isOwner ? 'owner' : (row.status === 'accepted' ? row.role : null);

    if (!role) return res.status(403).json({ success: false, message: 'Access denied.' });

    if (requireWrite && role === 'viewer') {
      return res.status(403).json({ success: false, message: 'You have view-only access. You cannot modify this farm.' });
    }

    next();
  } catch (err) {
    console.error('sensorAccess error:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

module.exports = sensorAccess;
