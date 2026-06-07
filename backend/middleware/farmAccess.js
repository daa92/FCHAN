/**
 * farmAccess middleware
 * Checks if req.user owns the farm OR is an accepted collaborator.
 * Sets req.farmAccess = { farm, role: 'owner'|'viewer'|'editor' }
 * Optionally checks for write permission with requireWrite = true.
 */
const db   = require('../config/db');
const Farm = require('../models/Farm');

const farmAccess = (requireWrite = false) => async (req, res, next) => {
  try {
    const farmId = req.params.farmId || req.params.id;
    const userId = req.user.id;

    const [rows] = await db.execute(`
      SELECT f.*,
             CASE 
               WHEN f.user_id = ? THEN 'owner'
               WHEN c.user_id IS NOT NULL THEN c.role 
               ELSE NULL 
             END AS access_role
      FROM farms f
      LEFT JOIN collaborators c 
        ON c.farm_id = f.id 
       AND c.user_id = ? 
       AND c.status = 'accepted'
      WHERE f.id = ? 
        AND (f.user_id = ? OR (c.user_id = ? AND c.status = 'accepted'))
    `, [userId, userId, farmId, userId, userId]);

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Farm not found or access denied.' });
    }

    const farm = rows[0];
    const role = farm.access_role;

    req.farm = farm;
    req.farmAccess = role;

    // Enforce read-only for viewers
    if (requireWrite && role === 'viewer') {
      return res.status(403).json({
        success: false,
        message: 'You have view-only access. You cannot modify this farm.'
      });
    }

    next();
  } catch (err) {
    console.error('farmAccess error:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

module.exports = farmAccess;
