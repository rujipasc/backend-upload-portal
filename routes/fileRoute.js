const express = require('express');
const router = express.Router();
const multer = require('multer');

const { uploadFile, viewFolders, viewFilesInFolder, downloadFile, deleteFile } = require('../controller/fileController');
const { verifyAccessToken } = require('../middlewares/auth');

const upload = multer({
    limits: { fileSize: 1024 * 1024 * 10 },
    fileFilter: (req, file, cb) => {

        file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
        if (
            file.mimetype === 'application/zip' ||
            file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || // XLSX
            file.mimetype === 'text/csv' || // CSV
            file.mimetype === 'application/vnd.ms-excel' || // XLS
          file.mimetype === 'application/x-zip-compressed' 
        ) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only CSV, XLS, XLSX, and ZIP files are allowed.'), false);
        }
    },
});

router.post('/upload', upload.array('fileUpload', 10), verifyAccessToken, uploadFile);
router.get('/folders', verifyAccessToken, viewFolders);
router.get('/folder/files', verifyAccessToken, viewFilesInFolder);
router.get('/files/download', verifyAccessToken, downloadFile);
router.delete('/files/delete', verifyAccessToken, deleteFile);


module.exports = router;