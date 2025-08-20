require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { createLogger, format, transports } = require('winston');
const { StatusCodes } = require('http-status-codes');

// Import routes (to be created)
// const authRoutes = require('./routes/auth');
// const questionRoutes = require('./routes/questions');
// const companyRoutes = require('./routes/companies');
// const categoryRoutes = require('./routes/categories');

// Initialize express app
const app = express();

// Configure logger
const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp(),
    format.json()
  ),
  transports: [
    new transports.Console(),
    new transports.File({ filename: 'logs/error.log', level: 'error' }),
    new transports.File({ filename: 'logs/combined.log' })
  ]
});

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Logging middleware
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(StatusCodes.OK).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
// app.use('/api/auth', authRoutes);
// app.use('/api/questions', questionRoutes);
// app.use('/api/companies', companyRoutes);
// app.use('/api/categories', categoryRoutes);

// 404 handler
app.use((req, res, next) => {
  res.status(StatusCodes.NOT_FOUND).json({
    status: 'error',
    message: 'Not Found',
    path: req.originalUrl
  });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error(`${err.status || StatusCodes.INTERNAL_SERVER_ERROR} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
  
  res.status(err.status || StatusCodes.INTERNAL_SERVER_ERROR).json({
    status: 'error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

module.exports = app;
