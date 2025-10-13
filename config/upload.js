const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

const uploadConfig = {
  maxFileSize: 50 * 1024 * 1024, // 50MB
  allowedMimeTypes: ['audio/mpeg', 'audio/mp3'],
  audioPath: 'public/audio',
  tempPath: 'temp/uploads'
};

// Ensure directories exist
const ensureDirectories = async () => {
  try {
    await fs.mkdir(uploadConfig.audioPath, { recursive: true });
    await fs.mkdir(uploadConfig.tempPath, { recursive: true });
    console.log('✓ Audio upload directories ready');
  } catch (error) {
    console.error('Error creating directories:', error);
  }
};

ensureDirectories();

// Audio storage configuration
const audioStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    // Use temp directory first - we'll move the file after getting body data
    try {
      await fs.mkdir(uploadConfig.tempPath, { recursive: true });
      cb(null, uploadConfig.tempPath);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    // Generate temporary filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(7);
    cb(null, `temp_${timestamp}_${randomStr}.mp3`);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  console.log('🔍 File filter check:', {
    originalname: file.originalname,
    mimetype: file.mimetype,
    fieldname: file.fieldname
  });

  if (uploadConfig.allowedMimeTypes.includes(file.mimetype) || file.originalname.endsWith('.mp3')) {
    cb(null, true);
  } else {
    cb(new Error('Only MP3 files are allowed'), false);
  }
};

// Create multer instance
const upload = multer({
  storage: audioStorage,
  limits: {
    fileSize: uploadConfig.maxFileSize
  },
  fileFilter: fileFilter
});

// Middleware to move file to correct location after upload
const moveToFinalDestination = async (req, res, next) => {
  if (!req.file) {
    return next();
  }

  try {
    const { surah, verse } = req.body;
    
    console.log('📦 Moving file to final destination:', { surah, verse });

    if (!surah || !verse) {
      // If no surah/verse provided, keep in temp for now
      console.log('⚠️ No surah/verse in body, keeping in temp directory');
      return next();
    }

    // Create surah-specific directory
    const surahNumber = surah.toString().padStart(3, '0');
    const verseNumber = verse.toString().padStart(3, '0');
    const surahDir = path.join(uploadConfig.audioPath, surahNumber);
    
    await fs.mkdir(surahDir, { recursive: true });

    // Generate final filename
    const timestamp = Date.now();
    const finalFilename = `${surahNumber}${verseNumber}_${timestamp}.mp3`;
    const finalPath = path.join(surahDir, finalFilename);

    // Move file from temp to final location
    await fs.rename(req.file.path, finalPath);

    console.log('✓ File moved to:', finalPath);

    // Update req.file with new location
    req.file.path = finalPath;
    req.file.filename = finalFilename;
    req.file.destination = surahDir;

    next();
  } catch (error) {
    console.error('❌ Error moving file:', error);
    
    // Clean up temp file if it exists
    try {
      await fs.unlink(req.file.path);
    } catch (unlinkError) {
      // Ignore unlink errors
    }

    next(error);
  }
};

module.exports = {
  uploadConfig,
  upload,
  moveToFinalDestination,
  ensureDirectories
};