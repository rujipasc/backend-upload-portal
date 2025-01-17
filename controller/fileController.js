const SftpClient = require('ssh2-sftp-client');
const Stream = require('stream');


function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ฟังก์ชันระบุประเภทไฟล์
function getContentType(fileName) {
    const ext = fileName.split('.').pop().toLowerCase();
    const mimeTypes = {
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'xls': 'application/vnd.ms-excel',
        'csv': 'text/csv',
        'zip': 'application/zip',
        'pdf': 'application/pdf',
        'json': 'application/json',
        'txt': 'text/plain'
    };
    return mimeTypes[ext] || 'application/octet-stream' || 'Unknown';
}

const uploadFile = async (req, res) => {
    const hospitalName = req.body.hospitalName;
    if (!hospitalName) {
        return res.status(400).json({ message: 'Hospital name is required' });
    }

    const sftp = new SftpClient();
    try {
        await sftp.connect({
            host: process.env.SFTP_HOST,
            port: process.env.SFTP_PORT,
            username: process.env.SFTP_USERNAME,
            password: process.env.SFTP_PASSWORD,
            readyTimeout: 30000,
        });

        const currentDate = new Date();
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');
        const dateFolder = `${year}-${month}-${day}`;
        const dateFiles = `${year}${month}T${currentDate.getHours()}${currentDate.getMinutes()}${currentDate.getSeconds()}`;
        const hospitalPath = `/Cnext/production/SFREPORT/Automation_Job/SES/HospitalUpload/${hospitalName}/${dateFolder}`;
        const folderExist = await sftp.exists(hospitalPath);

        if (!folderExist) {
            await sftp.mkdir(hospitalPath, true);
        }

        let uploadResult = [];

        if(!req.files || req.files.length === 0) {
            return res.status(400).json({ message: 'No files uploaded' });
        }

        for (const file of req.files) {
            const remotePath = `${hospitalPath}/${dateFiles}_${file.originalname}`;
            const readStream = new Stream.PassThrough();
            readStream.end(file.buffer);

            await sftp.put(readStream, remotePath);

            uploadResult.push({
                filename: file.originalname,
                size: file.size,
                remotePath: remotePath
            });
        };

        await sftp.end();
        res.status(200).json({ 
            message: 'Files uploaded successfully',
            uploads: uploadResult
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};

const viewFolders = async (req, res) => {
    const sftp = new SftpClient();
    try {
        // เชื่อมต่อ SFTP
        await sftp.connect({
            host: process.env.SFTP_HOST,
            port: 22,
            username: process.env.SFTP_USERNAME,
            password: process.env.SFTP_PASSWORD
        });

        const hospitalPath = `/Cnext/production/SFREPORT/Automation_Job/SES/HospitalUpload/`;
        
        const folderExist = await sftp.exists(hospitalPath);
        if (!folderExist) {
            return res.status(404).json({ message: "Hospital folder not found" });
        }

        let dateFolders = await sftp.list(hospitalPath);

        // กรองเฉพาะโฟลเดอร์
        dateFolders = dateFolders.filter(item => item.type === 'd');

        // เรียงตามเวลาล่าสุด
        dateFolders.sort((a, b) => b.modifyTime - a.modifyTime);

        const folders = dateFolders.map(folder => ({
            name: folder.name,
            modifiedAt: new Date(folder.modifyTime).toISOString(),
            size: folder.size,
            path: `${hospitalPath}${folder.name}`
        }));

        await sftp.end();
        
        return res.status(200).json({
            message: "Folders retrieved successfully",
            totalFolders: folders.length,
            folders: folders
        });

    } catch (error) {
        console.error('Error in viewFolders:', error);
        if (sftp) {
            await sftp.end();
        }
        res.status(500).json({ 
            message: "Failed to retrieve folders",
            error: error.message 
        });
    }
};

const viewFilesInFolder = async (req, res) => {
    const { folderPath = '', sortBy = 'modifyTime', order = 'desc' } = req.query;
    console.log('Original folderPath:', folderPath);
    
    let sftp = null;
    
    try {
        const sanitizedPath = folderPath
            .replace(/\.\./g, '')
            .replace(/[<>:"|?*\\]/g, '')
            .replace(/\/+/g, '/')
            .split('/')
            .map(segment => encodeURIComponent(segment))
            .join('/');

        console.log('Sanitized path:', sanitizedPath);

        sftp = new SftpClient();
        
        // เพิ่ม timeout options
        await sftp.connect({
            host: process.env.SFTP_HOST,
            port: 22,
            username: process.env.SFTP_USERNAME,
            password: process.env.SFTP_PASSWORD,
            readyTimeout: 10000, // 10 seconds
            retries: 3
        });

        const basePath = `/Cnext/production/SFREPORT/Automation_Job/SES/HospitalUpload/`;
        const fullPath = sanitizedPath ? `${basePath}${sanitizedPath}/` : basePath;
        
        console.log('Full path:', fullPath);

        const folderExist = await sftp.exists(fullPath);
        if (!folderExist) {
            if (sftp) await sftp.end();
            return res.status(404).json({ 
                message: "Folder not found",
                path: fullPath,
                originalPath: folderPath
            });
        }

        // Set timeout for list operation
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Operation timed out')), 30000)
        );

        const listPromise = sftp.list(fullPath);
        const items = await Promise.race([listPromise, timeoutPromise]);

        // จัดการการเรียงลำดับ
        const sortedItems = [...items].sort((a, b) => {
            if (order === 'desc') {
                return b[sortBy] - a[sortBy];
            }
            return a[sortBy] - b[sortBy];
        });

        const formattedItems = sortedItems.map(item => ({
            name: item.name,
            size: formatFileSize(item.size),
            rawSize: item.size,
            modifyTime: new Date(item.modifyTime).toISOString(),
            isDirectory: item.type === 'd',
            fullPath: `${fullPath}${item.name}`,
            type: getContentType(item.name),
            rights: item.rights
        }));

        if (sftp) await sftp.end();

        return res.status(200).json({
            message: "Items retrieved successfully",
            currentPath: fullPath,
            totalItems: formattedItems.length,
            items: formattedItems
        });

    } catch (error) {
        console.error('Error in viewFilesInFolder:', error);
        if (sftp) {
            try {
                await sftp.end();
            } catch (closeError) {
                console.error('Error closing SFTP connection:', closeError);
            }
        }
        res.status(500).json({ 
            message: "Failed to retrieve folder contents",
            error: error.message 
        });
    }
};

const downloadFile = async (req, res) => {
    const { filePath } = req.query;
    let sftp = null;

    if (!filePath) {
        return res.status(400).json({ message: "File path is required" });
    }

    try {
        sftp = new SftpClient();
        await sftp.connect({
            host: process.env.SFTP_HOST,
            port: 22,
            username: process.env.SFTP_USERNAME,
            password: process.env.SFTP_PASSWORD
        });

        // ทำความสะอาด path และป้องกัน path traversal
        const sanitizedPath = filePath
            .replace(/\.\./g, '')
            .replace(/[<>:"|?*\\]/g, '');

        const remoteFilePath = `/Cnext/production/SFREPORT/Automation_Job/SES/HospitalUpload/${sanitizedPath}`;

        const fileExist = await sftp.exists(remoteFilePath);
        if (!fileExist) {
            return res.status(404).json({ message: "File not found" });
        }

        // ดึงข้อมูลไฟล์
        const fileStats = await sftp.stat(remoteFilePath);
        const fileName = sanitizedPath.split('/').pop();
        const fileBuffer = await sftp.get(remoteFilePath);

        // ตั้งค่า headers ตาม file type
        const contentType = getContentType(fileName);
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Length', fileStats.size);
        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`);

        res.send(fileBuffer);

    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({ 
            message: "Failed to download file",
            error: error.message
        });
    } finally {
        if (sftp) {
            try {
                await sftp.end();
            } catch (error) {
                console.error('Error closing SFTP connection:', error);
            }
        }
    }
};

const deleteFile = async (req, res) => {
    const { filePath } = req.body;
    let sftp = null;

    if (!filePath) {
        return res.status(400).json({ message: "File path is required" });
    }

    try {
        sftp = new SftpClient();
        await sftp.connect({
            host: process.env.SFTP_HOST,
            port: 22,
            username: process.env.SFTP_USERNAME,
            password: process.env.SFTP_PASSWORD
        });

        // ทำความสะอาด path
        const sanitizedPath = filePath
        // ป้องกัน ../
        .replace(/(\.\.\/?)/g, '')
        // ยอมให้มี a-z, A-Z, 0-9, _, -, ., /, อักขระไทย และ space
        .replace(/[^a-zA-Z0-9_\-\u0E00-\u0E7F\s\/\.]/g, '')
        // ปรับหลาย slash ให้เป็น slash เดียว
        .replace(/\/+/g, '/');

        const remoteFilePath = `/Cnext/production/SFREPORT/Automation_Job/SES/HospitalUpload/${sanitizedPath}`;

        // ตรวจสอบว่าไฟล์มีอยู่จริง
        const fileExist = await sftp.exists(remoteFilePath);
        if (!fileExist) {
            return res.status(404).json({ message: "File not found" });
        }

        // ตรวจสอบว่าเป็นไฟล์ไม่ใช่โฟลเดอร์
        const stats = await sftp.stat(remoteFilePath);
        if (stats.isDirectory) {
            return res.status(400).json({ message: "Cannot delete a directory" });
        }

        await sftp.delete(remoteFilePath);

        return res.status(200).json({ 
            message: "File deleted successfully",
            deletedFile: sanitizedPath
        });

    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ 
            message: "Failed to delete file",
            error: error.message
        });
    } finally {
        if (sftp) {
            try {
                await sftp.end();
            } catch (error) {
                console.error('Error closing SFTP connection:', error);
            }
        }
    }
};

module.exports = {
    uploadFile,
    viewFolders,
    viewFilesInFolder,
    downloadFile,
    deleteFile,
};