const express = require('express');
const router = express.Router();
const itemController = require('../controllers/itemController');
const verifyToken = require('../middleware/authMiddleware');

// Public routes (view items)
router.get('/', itemController.getItems);

// Protected routes
router.post('/lost', verifyToken, itemController.createLostItem);
router.post('/found', verifyToken, itemController.createFoundItem);
router.delete('/:id', verifyToken, itemController.deleteItem);
router.patch('/:id/resolve', verifyToken, itemController.resolveItem);

module.exports = router;
