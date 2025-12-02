const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const path = require('path');

// Load env vars
dotenv.config();

// Connect DB
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// API routes
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/classes', require('./routes/classRoutes'));

// Serve frontend (client/dist)
app.use(express.static(path.join(__dirname, '../client/dist')));

// Always return index.html for React Router
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
