const express = require('express');
const router = express.Router();
const { createTakeaway } = require('../controllers/takeawayController');

router.post('/createTakeaway', createTakeaway);

module.exports = router;
