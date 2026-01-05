

const express = require('express');
const router = express.Router();
const profileController = require('../controllers/sendProfiledata');
const { ClerkExpressRequireAuth } = require('@clerk/clerk-sdk-node');

// This route will be: domain.com/api/profile/update
// The ClerkExpressRequireAuth middleware checks the token automatically

// src/routes/sendProfileRoutes.js

// Add this temporary logger to see what's happening
router.use((req, res, next) => {
    console.log("Header check:", req.headers.authorization);
    next();
});

// Your existing route
router.post('/update', ClerkExpressRequireAuth(), profileController.updateProfile);


module.exports = router;
