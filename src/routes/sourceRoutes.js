const express = require('express');
const router = express.Router();
const { createSource } = require('../controllers/sourceController');

router.post('/createSource', createSource);

module.exports = router;
