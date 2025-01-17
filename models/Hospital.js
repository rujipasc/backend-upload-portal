const mongoose = require("mongoose");

const hospitalSchema = new mongoose.Schema(
  {
    hospitalId: {
      type: String, // เปลี่ยนเป็น String เพื่อรองรับฟอร์แมตรันนิ่ง
      unique: true,
    },
    hospitalNameEN: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    hospitalNameTH: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    hospitalEmail: {
      type: String,
      match: [/^\S+@\S+\.\S+$/, "Invalid email format"]
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// เพิ่ม Pre-save Hook สำหรับการสร้าง hospitalId อัตโนมัติ
hospitalSchema.pre("save", async function (next) {
  if (!this.hospitalId) {
    try {
      const lastHospital = await mongoose
        .model("Hospital")
        .findOne({})
        .sort({ hospitalId: -1 });

      // หากยังไม่มีค่า hospitalId ในระบบ กำหนดค่าเริ่มต้นเป็น H0001
      const lastId = lastHospital ? lastHospital.hospitalId : "H0000";

      // ตัดเลขท้ายของ ID และเพิ่มค่า +1
      const newId = `H${String(parseInt(lastId.substring(1)) + 1).padStart(
        4,
        "0"
      )}`;

      this.hospitalId = newId; // กำหนด hospitalId ใหม่
    } catch (error) {
      console.error("Error generating hospitalId:", error);
      return next(error);
    }
  }
  next();
});

module.exports = mongoose.model("Hospital", hospitalSchema);