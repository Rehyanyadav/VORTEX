const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const xss = require('xss');
const mongoose = require('mongoose');
const CryptoJS = require('crypto-js');
require('dotenv').config();
const rateLimit = require('express-rate-limit');
const bodyParser = require('body-parser');
const { body, validationResult } = require('express-validator');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;
const SECRET_KEY = process.env.SECRET_KEY || 'vortex-super-secret-101';

let lastError = null;

// --- Database Connection ---
if (MONGODB_URI) {
  mongoose.connect(MONGODB_URI)
    .then(() => {
      console.log('Connected to MongoDB Atlas');
      lastError = null;
    })
    .catch(err => {
      console.error('MongoDB connection error:', err);
      lastError = err.message;
    });
} else {
  console.warn('WARNING: MONGODB_URI not found. Backend will not work on Vercel without it.');
}

// --- Schema & Model ---
const urlSchema = new mongoose.Schema({
  url: { type: String, required: true }, // Encrypted original URL
  shortCode: { type: String, required: true, unique: true },
  accessCount: { type: Number, default: 0 },
  expiresAt: { type: Date, default: null }, // Self-destruct time
  createdAt: { type: String, default: () => new Date().toISOString() },
  updatedAt: { type: String, default: () => new Date().toISOString() }
});

const URLModel = mongoose.model('URL', urlSchema);

// --- Middleware ---
app.use(helmet());
app.use(morgan('combined'));
app.use(cors({
  origin: '*', // Allow all for public Vercel deployment, or restrict to your frontend URL
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type']
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/shorten', limiter);

app.use(bodyParser.json());

// Helper to generate small but unique short codes
function generateShortCode() {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789'; // No confusing chars like 1, l, o, 0
  let result = '';
  for (let i = 0; i < 3; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// --- API Endpoints ---

// Create Short URL
app.post('/shorten', [
  body('url').isURL().withMessage('Please provide a valid URL')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { url, ttl } = req.body; // ttl in minutes
    const sanitizedUrl = xss(url);
    const shortCode = generateShortCode();

    // Encrypt the original URL
    const encryptedUrl = CryptoJS.AES.encrypt(sanitizedUrl, SECRET_KEY).toString();

    let expiresAt = null;
    if (ttl && ttl > 0) {
      expiresAt = new Date(Date.now() + ttl * 60000);
    }

    const newEntry = new URLModel({
      url: encryptedUrl,
      shortCode,
      expiresAt
    });

    await newEntry.save();

    res.status(201).json({
      id: newEntry._id,
      url: sanitizedUrl, // Return decrypted for the response
      shortCode: newEntry.shortCode,
      expiresAt: newEntry.expiresAt,
      createdAt: newEntry.createdAt
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create short URL' });
  }
});

// Retrieve Original URL
app.get('/shorten/:shortCode', async (req, res) => {
  const { shortCode } = req.params;
  
  try {
    const entry = await URLModel.findOne({ shortCode });

    if (!entry) {
      return res.status(404).json({ error: 'Short URL not found' });
    }

    // Check if expired
    if (entry.expiresAt && new Date() > entry.expiresAt) {
      await URLModel.deleteOne({ shortCode }); // Cleanup expired link
      return res.status(410).json({ error: 'Link has expired' });
    }

    // Decrypt the URL
    const bytes = CryptoJS.AES.decrypt(entry.url, SECRET_KEY);
    const decryptedUrl = bytes.toString(CryptoJS.enc.Utf8);

    entry.accessCount += 1;
    await entry.save();

    res.status(200).json({ ...entry._doc, url: decryptedUrl });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update Short URL
app.put('/shorten/:shortCode', [
  body('url').isURL().withMessage('Please provide a valid URL')
], async (req, res) => {
  const { shortCode } = req.params;
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { url } = req.body;
    const sanitizedUrl = xss(url);
    
    const entry = await URLModel.findOne({ shortCode });

    if (!entry) {
      return res.status(404).json({ error: 'Short URL not found' });
    }

    entry.url = sanitizedUrl;
    entry.updatedAt = new Date().toISOString();
    await entry.save();

    res.status(200).json({
      id: entry._id,
      url: entry.url,
      shortCode: entry.shortCode,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete Short URL
app.delete('/shorten/:shortCode', async (req, res) => {
  const { shortCode } = req.params;
  
  try {
    const result = await URLModel.findOneAndDelete({ shortCode });

    if (!result) {
      return res.status(404).json({ error: 'Short URL not found' });
    }

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get URL Statistics
app.get('/shorten/:shortCode/stats', async (req, res) => {
  const { shortCode } = req.params;
  
  try {
    const entry = await URLModel.findOne({ shortCode });

    if (!entry) {
      return res.status(404).json({ error: 'Short URL not found' });
    }

    res.status(200).json(entry);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Health Check / Diagnostics
app.get('/health', async (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected';
  res.status(200).json({
    status: 'Alive',
    database: dbStatus,
    error: lastError,
    env: process.env.NODE_ENV,
    hasMongoUri: !!process.env.MONGODB_URI
  });
});

// Export for Vercel
module.exports = app;

// Local Start
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Vortex Engine running locally on http://localhost:${PORT}`);
  });
}
