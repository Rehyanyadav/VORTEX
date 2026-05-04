const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const xss = require('xss');
require('dotenv').config();
const rateLimit = require('express-rate-limit');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const { body, validationResult } = require('express-validator');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'db.json');

// --- Middleware ---
app.use(helmet());
app.use(morgan('combined')); // Production-ready logging
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'], // Restrict to trusted origins
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type']
}));

// Rate limiting: 100 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/shorten', limiter);

app.use(bodyParser.json());

// --- Database Helper ---
const getDB = () => {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify({ urls: [] }, null, 2));
    }
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch (error) {
    console.error('Database read error:', error);
    return { urls: [] };
  }
};

const saveDB = (data) => {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Database write error:', error);
  }
};

// Helper to generate short codes
function generateShortCode() {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// --- API Endpoints ---

// Create Short URL
app.post('/shorten', [
  body('url').isURL().withMessage('Please provide a valid URL')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { url } = req.body;
  const sanitizedUrl = xss(url); // Sanitize input
  const db = getDB();
  const shortCode = generateShortCode();
  const now = new Date().toISOString();

  const newEntry = {
    id: Date.now().toString(), // Use timestamp for unique ID
    url: sanitizedUrl,
    shortCode,
    createdAt: now,
    updatedAt: now,
    accessCount: 0
  };

  db.urls.push(newEntry);
  saveDB(db);

  res.status(201).json({
    id: newEntry.id,
    url: newEntry.url,
    shortCode: newEntry.shortCode,
    createdAt: newEntry.createdAt,
    updatedAt: newEntry.updatedAt
  });
});

// Retrieve Original URL
app.get('/shorten/:shortCode', (req, res) => {
  const { shortCode } = req.params;
  const db = getDB();
  const entry = db.urls.find(u => u.shortCode === shortCode);

  if (!entry) {
    return res.status(404).json({ error: 'Short URL not found' });
  }

  // Increment access count
  entry.accessCount += 1;
  saveDB(db);

  res.status(200).json(entry);
});

// Update Short URL
app.put('/shorten/:shortCode', [
  body('url').isURL().withMessage('Please provide a valid URL')
], (req, res) => {
  const { shortCode } = req.params;
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { url } = req.body;
  const sanitizedUrl = xss(url);
  const db = getDB();
  const entryIndex = db.urls.findIndex(u => u.shortCode === shortCode);

  if (entryIndex === -1) {
    return res.status(404).json({ error: 'Short URL not found' });
  }

  db.urls[entryIndex].url = sanitizedUrl;
  db.urls[entryIndex].updatedAt = new Date().toISOString();
  saveDB(db);

  const updated = db.urls[entryIndex];
  res.status(200).json({
    id: updated.id,
    url: updated.url,
    shortCode: updated.shortCode,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt
  });
});

// Delete Short URL
app.delete('/shorten/:shortCode', (req, res) => {
  const { shortCode } = req.params;
  const db = getDB();
  const entryIndex = db.urls.findIndex(u => u.shortCode === shortCode);

  if (entryIndex === -1) {
    return res.status(404).json({ error: 'Short URL not found' });
  }

  db.urls.splice(entryIndex, 1);
  saveDB(db);

  res.status(204).send();
});

// Get URL Statistics
app.get('/shorten/:shortCode/stats', (req, res) => {
  const { shortCode } = req.params;
  const db = getDB();
  const entry = db.urls.find(u => u.shortCode === shortCode);

  if (!entry) {
    return res.status(404).json({ error: 'Short URL not found' });
  }

  res.status(200).json(entry);
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong on our end.' });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Vortex Engine running securely on http://localhost:${PORT}`);
});
