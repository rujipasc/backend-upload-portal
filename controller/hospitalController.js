const mongoose = require('mongoose');
const Hospital = require('../models/Hospital');

const createHospital = async (req, res) => {
    try {
        const { hospitalNameEN, hospitalNameTH, hospitalEmail } = req.body;

        if (
            !hospitalNameEN ||
            hospitalNameEN.trim() === '' ||
            !hospitalNameTH ||
            hospitalNameTH.trim() === ''
        ) {
            return res.status(400).json({
                success: false,
                message: 'Hospital English and Thai names are required',
              });
        }

        const existingHospital = await Hospital.findOne({
            $or: [{ hospitalNameEN }, { hospitalNameTH }],
          });
          if (existingHospital) {
            return res.status(400).json({
              success: false,
              message: 'Hospital name (English or Thai) already exists',
            });
          }

        const newHospital = new Hospital({
            hospitalNameEN,
            hospitalNameTH,
            hospitalEmail,
            isActive: true,
            createdAt: new Date(),
            updatedAt: null,
        });

        await newHospital.save();
        res.status(201).json({ 
            success: true,
            message: 'Hospital created successfully',
            data: newHospital,
        });
    } catch (error) {
        console.error('Error creating hospital:', error);
        return res.status(500).json({ 
            success: false,
            message: 'An error occurred. while creating hospital.',
            error: error.message,
        });
    };
};

const updateHospital = async (req, res) => {
    try {
        const { id } = req.params;
        const { hospitalNameEN, hospitalNameTH,hospitalEmail, isActive } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ 
                success: false,
                message: 'Invalid hospital ID format' 
            });
        }

        const hospital = await Hospital.findById(id);

        if (!hospital) {
            return res.status(404).json({ 
                success: false,
                message: 'Hospital not found' 
            });
        }

        if (hospitalNameEN && hospitalNameEN !== hospital.hospitalNameEN) {
            const existingHospitalEN = await Hospital.findOne({
              hospitalNameEN,
              _id: { $ne: id },
            });
            if (existingHospitalEN) {
              return res.status(400).json({
                success: false,
                message: 'Hospital English name already exists',
              });
            }
          }

          if (hospitalNameTH && hospitalNameTH !== hospital.hospitalNameTH) {
            const existingHospitalTH = await Hospital.findOne({
              hospitalNameTH,
              _id: { $ne: id },
            });
            if (existingHospitalTH) {
              return res.status(400).json({
                success: false,
                message: 'Hospital Thai name already exists',
              });
            }
          }

        const updateData = {
            ...(hospitalNameEN && { hospitalNameEN }),
            ...(hospitalNameTH && { hospitalNameTH }),
            ...(hospitalEmail && { hospitalEmail }),
            ...(typeof isActive !== 'undefined' && { isActive }),
            updatedAt: new Date(),
        };

        const updatedHospital = await Hospital.findByIdAndUpdate(
            id,
            updateData,
            { new: true }
        );

        return res.status(200).json({
            success: true,
            message: 'Hospital updated successfully',
            data: updatedHospital,
        });
    } catch (error) {
        console.error('Error updating hospital:', error);
        return res.status(500).json({ 
            success: false,
            message: 'An error occurred while updating hospital.',
            error: error.message,
        });
    }
};

const getHospitals = async (req, res) => {
    try {
        const hospitals = await Hospital.find();
        res.json({ hospitals });
    } catch (error) {
        console.error('Get hospitals error:', error);
        res.status(500).json({
            message: 'Error getting hospitals',
        });
    }
};

const deleteHospital = async (req, res) => {
    try {
        const hospitalId = req.params.id; // รับ userId จาก params

        // ตรวจสอบว่า userId ถูกต้องหรือไม่
        if (!mongoose.Types.ObjectId.isValid(hospitalId)) {
            return res.status(400).json({ message: 'Invalid user ID format' });
        }

        // ตรวจสอบว่าผู้ใช้มีอยู่ในระบบหรือไม่
        const hospital = await Hospital.findById(hospitalId);
        if (!hospital) {
            return res.status(404).json({ message: 'Hospital not found' });
        }

        // ลบผู้ใช้ถาวร
        await Hospital.findByIdAndDelete(hospitalId);

        res.json({ message: 'Hospital deleted permanently' });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ message: 'Error deleting user' });
    }
};



module.exports = {
    createHospital,
    updateHospital,
    getHospitals,
    deleteHospital,
};