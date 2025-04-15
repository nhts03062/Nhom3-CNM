// routes/upload.route.js
const express = require('express');
const multer = require('multer');
const { uploadFile } = require('../services/file.services');
const router = express.Router();

console.log('Upload route module loaded');

const upload = multer({ storage: multer.memoryStorage() });

router.use((req, res, next) => {
  console.log(`Router received: ${req.method} ${req.originalUrl}`);
  next();
});

router.post('/', upload.single('file'), async (req, res) => {
  console.log('Received POST /api/upload:', req.file);
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const fileUrl = await uploadFile(req.file);
    res.json({ url: fileUrl });
  } catch (error) {
    console.error('Error in upload route:', error);
    res.status(500).json({ error: error.message || 'Failed to upload file' });
  }
});

router.get('/', (req, res) => {
  console.log('Received GET /api/upload');
  res.json({ message: 'Upload endpoint exists' });
});

module.exports = router;