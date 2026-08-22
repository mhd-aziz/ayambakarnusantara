const multer = require("multer");

const storageConfig = multer.memoryStorage();

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

const fileFilterConfig = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const error = new Error(
      "Format file tidak didukung! Hanya gambar (JPEG, PNG, GIF, WEBP) yang diizinkan."
    );
    error.statusCode = 400;
    cb(error, false);
  }
};

const upload = multer({
  storage: storageConfig,
  fileFilter: fileFilterConfig,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

module.exports = upload;
