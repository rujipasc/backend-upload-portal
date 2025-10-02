require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const authRoutes = require('./routes/authRoute');
const userRoutes = require('./routes/userRoutes');
const hospitalRoutes = require('./routes/hospitalRoute');
const fileRoutes = require('./routes/fileRoute');


const app = express();
app.set('trust proxy', 1);
app.use(express.json());

const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
  maxAge:86400
};

app.use(cors(corsOptions));
app.use(morgan('combined'));
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", 'https://centralretail-upload-portal.vercel.app', ...corsOptions.origin],
      frameSrc: ["'self'", 'https://centralretail-upload-portal.vercel.app', ...corsOptions.origin],
      imgSrc: ["'self'", "data:", "blob:"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      upgradeInsecureRequests: null
    }
  },
  xssFilter: true,
  noSniff: true,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
}));


let retryCount = 0;
const connectWithRetry = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ MongoDB connection established successfully!");
  } catch (err) {
    retryCount++;
    console.error(`❌ MongoDB connection failed (attempt ${retryCount}):`, err.message);
    if (retryCount < 5) {
      setTimeout(connectWithRetry, 5000);
    } else {
      console.error("❌ Exceeded max retries, shutting down.");
      process.exit(1);
    }
  }
};

connectWithRetry();



app.get('/api/v1/healthcheck', (req, res) => {
    res.status(200).json({
      status: 'success',  
      message: 'Server is running fine and healthy', 
      timestamp: new Date().toISOString()
    });
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/hospitals', hospitalRoutes);
app.use('/api/v1/sftp', fileRoutes)

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
      status: 'error',
      message: 'Something went wrong!',
      error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message
  });
});

app.use((req, res) => {
  res.status(404).json({
      status: 'error',
      message: 'Route not found'
  });
});

const PORT = process.env.PORT || 8080;
const server = app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
}).on('error', (err) => {
  console.error('❌ Failed to start server:', err);
});

async function shutdown(signal) {
  console.log(`${signal} signal received: closing HTTP server`);
  server.close(async () => {
    console.log('✅ HTTP server closed');
    try {
      await mongoose.connection.close(false);
      console.log('✅ MongoDB connection closed');
    } catch (err) {
      console.error('❌ Error closing MongoDB connection:', err);
    }
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));