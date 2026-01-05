const express = require('express');
const router = express.Router();
const subController = require('../controllers/subscriptionController');
const { ClerkExpressRequireAuth } = require('@clerk/clerk-sdk-node');

router.post('/sync', ClerkExpressRequireAuth(), subController.updateSubscription);

module.exports = router;
