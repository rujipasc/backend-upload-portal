const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { generateToken } = require('../middlewares/auth');
const sendEmail = require('../utils/sendEmail');
const resetPasswordEmail = require('../template/resetPasswordEmail');

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const user = await User.findOne({ email });
        if (!user || !user.isActive) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const isValidPassword = await user.comparePassword(password);
        console.log('Password comparison result:', isValidPassword);
        if (!isValidPassword) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const tokens = generateToken(user);

        user.refreshToken = tokens.refreshToken;
        user.LastLogin = new Date();
        await user.save();

        res.json({
            message: 'Login successful',
            ...tokens,
            user: {
                email: user.email,
                hospitalName: user.hospitalName,
                role: user.role,
            },
        })
    } catch (error) {
        res.status(500).json({ message: 'Error logging in' });
    }
};

const logout = async (req, res) => {
    try {
        const userId = req.user.userId;

        await User.findByIdAndUpdate(userId, { refreshToken: null });

        res.json({ message: 'Logout successful' });
    } catch (error) {
        res.status(500).json({ message: 'Error logging out' });
    }
};

const changePassword = async (req, res) => {
    const { userId } = req.params;
    const { oldPassword, newPassword } = req.body;

    try {
        let user;

        if (req.user.role === 'systemAdmin') {
            // System admin สามารถเปลี่ยนรหัสผ่านของผู้ใช้อื่นได้
            user = await User.findById(userId);
            if (!user) return res.status(404).json({ message: 'User not found' });
        } else if (req.user.role === 'admin') {
            // Admin ไม่สามารถเปลี่ยนรหัสผ่านของ system admin ได้
            user = await User.findById(userId);
            if (!user) return res.status(404).json({ message: 'User not found' });
            if (user.role === 'systemAdmin') {
                return res.status(403).json({ message: 'Admins cannot change the password of a system admin' });
            }
        } else {
            // ผู้ใช้ทั่วไปเปลี่ยนรหัสผ่านของตัวเองเท่านั้น
            user = await User.findById(req.user.userId);
            if (!user) return res.status(404).json({ message: 'User not found' });

            const isMatch = await bcrypt.compare(oldPassword, user.password);
            if (!isMatch) return res.status(400).json({ message: 'Old password is incorrect' });
        }

        // ตรวจสอบว่า newPassword ไม่เหมือนกับ oldPassword
        const isSamePassword = await bcrypt.compare(newPassword, user.password);
        if (isSamePassword) {
            return res.status(400).json({ message: 'New password cannot be the same as old password' });
        }

        // ตรวจสอบความยาวของรหัสผ่านใหม่
        if (newPassword.length < 8) {
            return res.status(400).json({ message: 'New password must be at least 8 characters long' });
        }

        // บันทึกรหัสผ่านใหม่
        user.password = newPassword;
        await user.save();

        res.status(200).json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ message: 'Error changing password' });
    }
};

const forgetPassword = async (req, res) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: 'User not found' });

        // สร้างโทเค็นรีเซ็ตรหัสผ่าน
        const resetToken = crypto.randomBytes(32).toString('hex');
        user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        user.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 นาที
        await user.save();

        // สร้างลิงก์รีเซ็ตรหัสผ่าน
        const resetLink = `${process.env.ALLOWED_ORIGINS}/reset-password?token=${resetToken}`;

        const hospitalName = user.hospitalName || 'Hospital';

        // ส่งอีเมล
        const emailSent = await sendEmail({
            to: email,
            subject: '[CG HRIS] : Password Reset Request',
            text: `Click here to reset your password: ${resetLink}`,
            html: resetPasswordEmail(hospitalName, resetLink),
        });

        if (emailSent.success) {
            res.status(200).json({ message: 'Reset password link has been sent to your email.' });
        } else {
            res.status(500).json({ message: emailSent.error });
        }
    } catch (error) {
        console.error('Forget password error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const validatePassword = (password) => {
    const validations = {
        minLength: password.length >= 8,
        hasUpperCase: /[A-Z]/.test(password),
        hasLowerCase: /[a-z]/.test(password),
        hasNumber: /[0-9]/.test(password)
    };
    
    return {
        isValid: Object.values(validations).every(Boolean),
        errors: Object.entries(validations)
            .filter(([_, isValid]) => !isValid)
            .map(([key]) => {
                switch(key) {
                    case 'minLength': return 'Password must be at least 8 characters long';
                    case 'hasUpperCase': return 'Password must contain at least one uppercase letter';
                    case 'hasLowerCase': return 'Password must contain at least one lowercase letter';
                    case 'hasNumber': return 'Password must contain at least one number';
                    default: return '';
                }
            })
    };
};

const resetPassword = async (req, res) => {
    const { token, newPassword } = req.body;

    try {
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpire: { $gt: Date.now() },
        });

        if (!user) {
            return res.status(404).json({ message: 'Invalid or expired token' });
        }

        // ตรวจสอบความยาวของรหัสผ่านใหม่
        const { isValid, errors } = validatePassword(newPassword);
        if (!isValid) {
            return res.status(400).json({ 
                message: 'Invalid password format',
                errors: errors
            });
        }
        
        // ตรวจสอบว่า newPassword ไม่เหมือนกับ oldPassword
        const isSamePassword = await bcrypt.compare(newPassword, user.password);
        if (isSamePassword) {
            return res.status(400).json({ message: 'New password cannot be the same as old password' });
        }
        
        // console.log('Before password hash - newPassword:', newPassword);

        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // console.log('After password hash - hashedPassword', hashedPassword);

        await User.findByIdAndUpdate(user._id, {
            $set: {
                password: hashedPassword,
                resetPasswordToken: undefined,
                resetPasswordExpire: undefined,
            }
        });

        // const updatedUser = await User.findById(user._id);ß
        // console.log('After save - stored password:', updatedUser.password);

        res.status(200).json({ message: 'Password reset successfully' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ message: 'Error resetting password' });
    }
};


module.exports = { 
    login, 
    logout, 
    changePassword, 
    forgetPassword, 
    resetPassword 
};