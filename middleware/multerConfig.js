// middleware/multerConfig.js

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Define the destination directory for uploads
// We use path.join to go up one directory ('..') from /middleware to the project root
const uploadDir = path.join(__dirname, '..', 'public/uploads');

// Ensure the upload directory exists, create it if it doesn't
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer's storage engine
const storage = multer.diskStorage({
    // destination: Tells multer where to save the files
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    // filename: Tells multer how to name the files
    filename: function (req, file, cb) {
        // Create a unique filename to prevent files with the same name from overwriting each other
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// Create the multer upload instance with the storage configuration
const upload = multer({ storage: storage });

// Export the configured upload instance to use in your routes
module.exports = upload;