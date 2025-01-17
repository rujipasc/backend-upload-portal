const express = require('express');
const router = express.Router();
const {
    createUser,
    updateUser,
    getAllUser,
    getOneUser,
    deleteUser,
} = require('../controller/userController');
const {
    verifyAccessToken,
    checkAdminPermission,
} = require('../middlewares/auth');

// User management routes (protected and admin-only)
router.post('/create', verifyAccessToken, checkAdminPermission, createUser);
router.put('/edit/:id', verifyAccessToken, checkAdminPermission, updateUser);
router.get('/', verifyAccessToken, checkAdminPermission, getAllUser);
router.get('/:id', verifyAccessToken, checkAdminPermission, getOneUser);
router.delete('/:id', verifyAccessToken, checkAdminPermission, deleteUser);

module.exports = router;