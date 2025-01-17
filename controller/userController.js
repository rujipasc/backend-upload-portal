const User = require('../models/User');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const validateEmail = (email) => {
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    return emailRegex.test(email);
};

const validatePassword = (password) => {
    const minlength = password.length >= 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);

    return minlength && hasUpperCase && hasLowerCase && hasNumber;
};

const sanitizeUser = (user) => {
    const sanitized = user.toObject();
    delete sanitized.password;
    return sanitized;
};

const createUser = async (req, res) => {
    try {
        const adminRoles = ['admin', 'systemAdmin'];
        if (!adminRoles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Only admin and system admin can create users' });
        }
        const { email, password, role, hospitalName } = req.body;

        if (!email || !password || !hospitalName) {
            return res.status(400).json({ messagge: 'Email , password and hospitalName are required' });
        };

        if (!validateEmail(email)) {
            return res.status(400).json({ message: 'Invalid email format' });
        }

        if (!validatePassword(password)) {
            return res.status(400).json({ message: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number' });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ message: 'Email already exists' });
        }
        
        const VALID_ROLES = ['user', 'admin', 'guest', 'systemAdmin'];
        if (role && !VALID_ROLES.includes(role)) {
            return res.status(400).json({ message: `Invalid role Must be one of: ${VALID_ROLES.join(', ')}` });
        }

        if (role === 'admin' && req.user.role !== 'systemAdmin') {
            return res.status(403).json({ message: 'Only system admin can create admin users' });
        };

        if (role === 'systemAdmin' && req.user.role !== 'systemAdmin') {
            return res.status(403).json({ message: 'Only system admin can create system admin users' });
        };

        const hashedPassword = await bcrypt.hash(password, 12);


        const user = await User.create({
            email,
            password,
            role: role || 'guest',
            hospitalName,
            isActive: true,
            createdBy: req.user.email,
            createdAt: new Date(),
        });

        res.status(201).json({
            message: 'User created successfully',
            user: sanitizeUser(user),
        })
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({
            message: 'Error creating user',
        });
    }
};

const updateUser = async (req, res) => {
    try {
        const userId = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ message: 'Invalid user ID format' });
        }

        const updates = { ...req.body };

        const existingUser = await User.findById(userId);
        if (!existingUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        delete updates.password;
        delete updates.refreshToken;

        if (updates.role) {
            // Only admin and systemAdmin can change roles
            const adminRoles = ['admin', 'systemAdmin'];
            if (!adminRoles.includes(req.user.role)) {
                return res.status(403).json({ 
                    message: 'Only admin and system admin can modify roles' 
                });
            }

            // Validate role
            const VALID_ROLES = ['user', 'admin', 'guest', 'systemAdmin'];
            if (!VALID_ROLES.includes(updates.role)) {
                return res.status(400).json({ 
                    message: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` 
                });
            }

            // Only systemAdmin can assign admin role
            if (updates.role === 'admin' && req.user.role !== 'systemAdmin') {
                return res.status(403).json({ 
                    message: 'Only system admin can assign admin role' 
                });
            }

            // Only systemAdmin can assign systemAdmin role
            if (updates.role === 'systemAdmin' && req.user.role !== 'systemAdmin') {
                return res.status(403).json({ 
                    message: 'Only system admin can assign system admin role' 
                });
            }

            // Prevent systemAdmin role removal by non-systemAdmin
            if (existingUser.role === 'systemAdmin' && req.user.role !== 'systemAdmin') {
                return res.status(403).json({ 
                    message: 'Only system admin can modify system admin roles' 
                });
            }
        }

        if (updates.hospitalName && updates.hospitalName.trim() === '') {
            return res.status(400).json({ message: 'Hospital name cannot be empty' });
        };

        if (updates.isActive !== undefined && typeof updates.isActive !== 'boolean') {
            return res.status(400).json({ message: 'isActive must be a boolean' });
        };

        updates.updatedBy = req.user.email;
        updates.updatedAt = new Date();

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            updates,
            { new: true,
                runValidators: true,
            }
        ).select('-password -refreshToken');

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found or no changes made' });
        }

        res.json({ message: 'User updated successfully', user: sanitizeUser(updatedUser) });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({
            message: 'Error updating user',
        });
    };
};

const getAllUser = async (req, res) => {
    try {
        const users = await User.find().select('-password -refreshToken');
        res.json({ users });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({
            message: 'Error getting users',
        });
    }
};

const getOneUser = async (req, res) => {
    try {
        const userId = req.params.id;

        // ตรวจสอบว่า userId เป็น ObjectId ที่ถูกต้องหรือไม่
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ message: 'Invalid user ID format' });
        }

        const user = await User.findById(userId).select('-password -refreshToken');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ message: 'User fetched successfully', user });
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ message: 'Error fetching user' });
    }
};

const deleteUser = async (req, res) => {
    try {
        const userId = req.params.id; // รับ userId จาก params

        // ตรวจสอบว่า userId ถูกต้องหรือไม่
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ message: 'Invalid user ID format' });
        }

        // ตรวจสอบว่าผู้ใช้มีอยู่ในระบบหรือไม่
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // ป้องกันการลบบัญชีตัวเอง
        if (req.user.id === userId) {
            return res.status(403).json({ message: 'You cannot delete your own account' });
        }

        // ลบผู้ใช้ถาวร
        await User.findByIdAndDelete(userId);

        res.json({ message: 'User deleted permanently' });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ message: 'Error deleting user' });
    }
};


module.exports = {
    createUser,
    updateUser,
    getAllUser,
    getOneUser,
    deleteUser,
};