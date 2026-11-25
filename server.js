const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { db } = require('./config/firebase');
const applicationRoutes = require('./routes/applicationRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Health check route (Server + Firestore connection test karne ke liye)
app.get('/api/health', async (req, res) => {
  try {
    await db.listCollections();
    res.status(200).json({
      status: 'ok',
      message: 'InternTrack API & Firebase Firestore connected successfully!',
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Firestore connection failed',
      details: error.message,
    });
  }
});

// Main CRUD API routes
app.use('/api/applications', applicationRoutes);

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});