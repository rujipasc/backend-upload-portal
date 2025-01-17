const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    password: {
        type: String,
        required: true,
        minlength: 8,
    },
    hospitalName: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        enum: ['user', 'admin', 'guest', 'systemAdmin'],
        default: 'guest',
    },
    refreshToken: String,
    LastLogin: Date,
    isActive: {
        type: Boolean,
        required: true,
    },
    resetPasswordToken: String, // เก็บโทเค็นสำหรับรีเซ็ตรหัสผ่าน
    resetPasswordExpire: Date, // เก็บเวลาหมดอายุของโทเค็น
}, { timestamps: true });

userSchema.pre('save', async function (next) {
    console.log('Pre-save middleware triggered');
    console.log('Password modified:', this.isModified('password'));
    if (!this.isModified('password')) return next();

    try {
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
        console.log('Password after pre-save hash:', this.password);
        next();
    } catch (error) {
        next(error);
    }
});

userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;