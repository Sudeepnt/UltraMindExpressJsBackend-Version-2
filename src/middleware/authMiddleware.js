// const admin = require('../../firebase');

// const authMiddleware = async (req, res, next) => {
//   try {
//     // Get token from header
//     const token = req.headers.authorization?.split('Bearer ')[1];
    
//     if (!token) {
//       return res.status(401).json({ error: 'No authentication token provided' });
//     }

//     // Verify token with Firebase
//     const decodedToken = await admin.auth().verifyIdToken(token);
    
//     // Attach user to request so controllers can access it
//     req.user = {
//       firebase_uid: decodedToken.uid,
//       email: decodedToken.email
//     };
    
//     // Call next middleware or route handler
//     next();
//   } catch (error) {
//     console.error('Auth error:', error);
//     res.status(401).json({ error: 'Invalid or expired token' });
//   }
// };

// module.exports = authMiddleware;
