const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase'); 
const { ClerkExpressRequireAuth } = require('@clerk/clerk-sdk-node');
const clerkWebhookController = require("../controllers/clerkWebhookController");

// middleware to ensure only valid Clerk users can call this
const requireAuth = ClerkExpressRequireAuth();


router.post("/clerk-webhook", clerkWebhookController);



module.exports = router;
