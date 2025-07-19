// Initialize Datadog tracer FIRST (before any other imports)
const tracer = require('dd-trace').init({
  service: process.env.DD_SERVICE || 'nodejs-app',
  env: process.env.DD_ENV || 'dev',
  version: process.env.DD_VERSION || '1.0.0',
  logInjection: true,
  profiling: true,
  runtimeMetrics: true
});

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
app.use(morgan('combined'));

// Custom middleware for Datadog tracing
app.use((req, res, next) => {
  const span = tracer.scope().active();
  if (span) {
    span.setTag('http.url', req.url);
    span.setTag('http.method', req.method);
    span.setTag('user.ip', req.ip);
  }
  next();
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Health check endpoints
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'nodejs-app',
    version: process.env.DD_VERSION || '1.0.0'
  });
});

app.get('/health/ready', async (req, res) => {
  try {
    // Check if backend is reachable
    const response = await axios.get(`${API_URL}/health`, {
      headers: { 'X-API-KEY': API_KEY },
      timeout: 5000
    });
    
    res.status(200).json({ 
      status: 'ready',
      backend: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'not ready',
      backend: 'disconnected',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Proxy API requests to backend
app.use('/api', async (req, res) => {
  const span = tracer.startSpan('proxy.request');
  try {
    const url = `${API_URL}${req.url}`;
    const method = req.method.toLowerCase();
    const data = method === 'get' ? { params: req.query } : { data: req.body };
    
    span.setTag('proxy.url', url);
    span.setTag('proxy.method', method);
    
    console.log(`[${new Date().toISOString()}] Proxying ${method.toUpperCase()} ${url}`);
    
    const response = await axios({
      method,
      url,
      ...data,
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': API_KEY
      },
      timeout: 10000
    });
    
    span.setTag('http.status_code', response.status);
    span.setTag('proxy.success', true);
    
    return res.status(response.status).json(response.data);
  } catch (error) {
    span.setTag('error', true);
    span.setTag('error.message', error.message);
    span.setTag('http.status_code', error.response?.status || 500);
    span.setTag('proxy.success', false);
    
    console.error(`[${new Date().toISOString()}] Error proxying request:`, {
      url: req.url,
      method: req.method,
      error: error.message,
      status: error.response?.status
    });
    
    return res.status(error.response?.status || 500).json(
      error.response?.data || { message: 'Internal Server Error' }
    );
  } finally {
    span.finish();
  }
});

// Serve index.html for any other route (SPA support)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`[${new Date().toISOString()}] Server running on port ${PORT}`);
  console.log(`[${new Date().toISOString()}] API URL: ${API_URL}`);
  console.log(`[${new Date().toISOString()}] Datadog tracing enabled for service: ${process.env.DD_SERVICE || 'nodejs-app'}`);
});

// Graceful shutdown
const gracefulShutdown = (signal) => {
  console.log(`[${new Date().toISOString()}] Received ${signal}. Starting graceful shutdown...`);
  
  server.close((err) => {
    if (err) {
      console.error(`[${new Date().toISOString()}] Error during shutdown:`, err);
      process.exit(1);
    }
    
    console.log(`[${new Date().toISOString()}] Server closed successfully`);
    
    // Close Datadog tracer
    tracer.flush(() => {
      console.log(`[${new Date().toISOString()}] Datadog tracer flushed`);
      process.exit(0);
    });
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
