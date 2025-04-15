// services/file.services.js

require('dotenv').config();
const AWS = require('aws-sdk');

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const randomString = (numberC) => {
  return `${Math.random().toString(36).substring(2, numberC + 2)}`;
};

const FILE_TYPE_MATCH = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'audio/mpeg',
  'video/mp4',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.rar',
  'application/zip',
];

const uploadFile = async (file) => {
  if (!file) {
    throw new Error('No file provided');
  }

  if (!FILE_TYPE_MATCH.includes(file.mimetype)) {
    throw new Error(`${file.originalname} không hợp lệ`);
  }

  const filePath = `${randomString(4)}-${Date.now()}-${file.originalname}`;

  const uploadParams = {
    Bucket: process.env.BUCKET_NAME,
    Body: file.buffer,
    Key: filePath,
    ContentType: file.mimetype,
  };

  try {
    const data = await s3.upload(uploadParams).promise();
    console.log(`✅ File uploaded successfully: ${data.Location}`);
    return data.Location;
  } catch (error) {
    console.error('❌ Lỗi khi tải file lên S3:', error.code, error.message);
    throw new Error(`Tải file lên S3 thất bại: ${error.message}`);
  }
};

module.exports = { uploadFile };
