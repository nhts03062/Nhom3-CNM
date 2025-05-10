const express = require('express');
const router = express.Router();
const multer = require('multer');
const uploadController  = require('../controller/upload.controller');

const storage = multer.memoryStorage();
const upload = multer({ storage });

// Route: POST /upload
router.post('/', upload.single('file'), uploadController.uploadSingleFile);

module.exports = router;