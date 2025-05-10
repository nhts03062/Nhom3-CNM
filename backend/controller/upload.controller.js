const multer = require('multer');

// Cấu hình multer dùng memoryStorage
const storage = multer.memoryStorage();
const upload = multer({ storage });

const { uploadFile } = require('../services/file.services');

const uploadController = {};

uploadController.uploadSingleFile = async (req, res) => {
  const file = req.file;

  if (!file) {
    return res.status(400).json({ message: 'Không có file nào được gửi lên' });
  }

  try {
    const fileUrl = await uploadFile(file);
    res.status(200).json(fileUrl);
  } catch (error) {
    res.status(500).json({ message: 'Upload thất bại', error: error.message });
  }
};

module.exports = uploadController



