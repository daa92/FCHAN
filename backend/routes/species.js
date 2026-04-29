const express = require('express');
const router = express.Router();
const {
  getAllSpecies, searchSpecies, getSpecies,
  createSpecies, updateSpecies, deleteSpecies
} = require('../controllers/speciesController');
const { auth } = require('../middleware/auth');

router.use(auth);

router.get('/', getAllSpecies);
router.get('/search', searchSpecies);
router.get('/:id', getSpecies);
router.post('/', createSpecies);
router.put('/:id', updateSpecies);
router.delete('/:id', deleteSpecies);

module.exports = router;
