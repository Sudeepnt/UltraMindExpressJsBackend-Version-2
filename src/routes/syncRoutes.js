const express = require('express');
const router = express.Router();
const {syncData, syncImages, getData} = require('../controllers/syncController');

// POST = Upload data from Android
router.post('/syncdata', syncData);        // Upload: Android → PostgreSQL

// GET = Download data to Android  
router.get('/downloaddata', getData);       // Download: PostgreSQL → Android

// POST = Upload images
router.post('/syncimages', syncImages);    // Upload images

module.exports = router;
