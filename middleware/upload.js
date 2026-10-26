const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

// 🖼️ IMAGE storage
const imageStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'digital-world/images',
    resource_type: 'image',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'],
    transformation: [
      { width: 800, height: 800, crop: 'limit', quality: 'auto' }
    ]
  }
});

// 🎥 VIDEO storage
const videoStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'digital-world/videos',
    resource_type: 'video',
    allowed_formats: ['mp4', 'mov', 'avi', 'webm', 'mkv', 'flv'],
    transformation: [
      { quality: 'auto', fetch_format: 'auto' }
    ]
  }
});

// Image uploader (existing)
const uploadImage = multer({
  storage: imageStorage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5 MB
});

// Video uploader
const uploadVideo = multer({
  storage: videoStorage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50 MB for video
});

// Default export (backward compatibility)
module.exports = uploadImage;
module.exports.uploadImage = uploadImage;
module.exports.uploadVideo = uploadVideo;