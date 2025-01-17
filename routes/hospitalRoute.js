const express = require('express');
const router = express.Router();

const { 
    createHospital,
    updateHospital,
    getHospitals,
    deleteHospital
} = require('../controller/hospitalController');
const {
    verifyAccessToken,
    checkAdminPermission,
} = require('../middlewares/auth');

// Hospital management routes
router.post('/create', verifyAccessToken, checkAdminPermission, createHospital);
router.put('/update/:id', verifyAccessToken, checkAdminPermission, updateHospital);
router.get('/', verifyAccessToken, checkAdminPermission ,getHospitals);
router.delete('/:id', verifyAccessToken, checkAdminPermission, deleteHospital);

module.exports = router;