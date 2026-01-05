const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// All these are prefixed with /api/users
router.post('/createUser', userController.createUser);
router.post('/update-profile', userController.updateProfile);
router.post('/update-plan', userController.updatePlan);

module.exports = router;
