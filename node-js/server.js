const express = require('express');
const path = require('path');
const cors = require('cors');
const morgan = require('morgan');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const API_URL = process.env.API_URL || 'http://backend:8000';
const API_KEY = process.env.API_KEY || '';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Proxy API requests to backend
app.use('/api', async (req, res) => {
  try {
    const url = `${API_URL}${req.url}`;
    const method = req.method.toLowerCase();
    const data = method === 'get' ? { params: req.query } : { data: req.body };
    
    const response = await axios({
      method,
      url,
      ...data,
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': API_KEY
      },
    });
    
    return res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Error proxying request:', error.message);
    return res.status(error.response?.status || 500).json(error.response?.data || { message: 'Internal Server Error' });
  }
});

// Serve index.html for any other route (SPA support)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API URL: ${API_URL}`);
});
