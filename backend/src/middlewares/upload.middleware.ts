import multer from 'multer';
import path from 'path';
import fs from 'fs';

const uploadDir = path.join(__dirname, '../../uploads/avatars');

// Ensure directory exists
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `avatar-${uniqueSuffix}${ext}`);
    }
});

const fileFilter = (req: any, file: any, cb: any) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only images are allowed!'), false);
    }
};

export const uploadAvatar = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

const pluginUploadDir = path.join(__dirname, '../../storage/custom_plugins');

if (!fs.existsSync(pluginUploadDir)) {
    fs.mkdirSync(pluginUploadDir, { recursive: true });
}

const pluginStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, pluginUploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `upload-${uniqueSuffix}${ext}`);
    }
});

const pluginFileFilter = (req: any, file: any, cb: any) => {
    if (file.originalname.endsWith('.jar')) {
        cb(null, true);
    } else {
        cb(new Error('Only .jar files are allowed!'), false);
    }
};

export const uploadPlugin = multer({
    storage: pluginStorage,
    fileFilter: pluginFileFilter,
    limits: {
        fileSize: 100 * 1024 * 1024 // 100MB limit
    }
});
