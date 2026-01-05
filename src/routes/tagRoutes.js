const express = require('express');
const router = express.Router();
const { createTag } = require('../controllers/tagController');

router.post('/createTag', createTag);

module.exports = router;
