require('dotenv').config({ path: '/var/www/UltraMindExpressJsBackend/.env' });
const express = require('express');
const { ClerkExpressRequireAuth } = require('@clerk/clerk-sdk-node');
const cors = require("cors");

const app = express();
const Port = 3000;

app.use(express.json()); 


app.post('/api/test-https', (req, res) => {
    console.log("--- HTTPS CONNECTION SUCCESS ---");
    console.log("Received data:", req.body);
    
    res.status(200).json({ 
        success: true, 
        message: "VPS received this via HTTPS!" 
    });
});


app.post('/api/test-ip', (req, res) => {
    console.log("--- HANDSHAKE TEST ---");
    console.log("Data from phone:", req.body);
    res.status(200).json({ status: "Success", message: "VPS is alive!" });
});


app.post('/api/test-connection', (req, res) => {
    console.log("--- BINGO! CONNECTION SUCCESS ---");
    console.log("Auth Header:", req.headers.authorization);
    console.log("Data Received:", req.body);
    
    res.status(200).json({ 
        success: true, 
        message: "VPS received your data!" 
    });
});



app.use((req, res, next) => {
  console.log(`📡 Traffic: ${req.method} ${req.path}`);
  next();
});

app.use(cors({ origin: "*" }));

// --- PUBLIC WEBHOOKS ---
const webhookRoutes = require('./src/routes/webhookRoutes');
app.use('/api/webhooks', webhookRoutes);

// --- PROTECTED ROUTES SETTINGS ---
app.use(express.json());
const requireAuth = ClerkExpressRequireAuth();
const verifySubscription = require('./src/middleware/subscriptionMiddleware');

// --- IMPORT ALL YOUR ROUTES ---
const userRoutes = require('./src/routes/userRoutes');
const aiRoutes = require('./src/routes/aiRoutes');
const sourceRoutes = require('./src/routes/sourceRoutes');
const takeawayRoutes = require('./src/routes/takeawayRoutes');
const syncRoutes = require('./src/routes/syncRoutes');
const sendProfileRoutes = require('./src/routes/sendProfileRoutes');
const subscriptionRoutes = require('./src/routes/subscriptionRoutes');


// ✅ ADDED requireAuth to these two lines
app.use('/api/subscription', requireAuth, subscriptionRoutes);
app.use('/api/profile', requireAuth, sendProfileRoutes);

// These are already correct
app.use('/api/users', requireAuth, userRoutes);
app.use('/api/ai', requireAuth, verifySubscription, aiRoutes);
app.use('/api/sources', requireAuth, sourceRoutes);
app.use('/api/takeaways', requireAuth, takeawayRoutes);
app.use('/api/sync', requireAuth, syncRoutes);


app.use((err, req, res, next) => {
  if (err.message === 'Unauthenticated') {
    res.status(401).json({ error: 'Unauthenticated' });
  } else {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(Port, () => {
  console.log(`🚀 UltraMynd Server Online: ${Port}`);
});
