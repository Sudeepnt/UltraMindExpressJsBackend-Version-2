const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const clerkController = require('../controllers/clerkWebhookController');
const appleController = require('../controllers/appleWebhookController');

// Clerk needs RAW body for signature verification
router.post('/clerk', bodyParser.raw({ type: 'application/json' }), clerkController.handleClerkWebhook);

// Apple needs standard JSON
router.post('/apple', express.json(), appleController.handleAppleWebhook);

module.exports = router;
