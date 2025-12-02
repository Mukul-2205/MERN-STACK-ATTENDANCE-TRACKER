const mongoose = require('mongoose');

const attendanceSchema = mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    class: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Class',
    },
    date: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['present', 'absent'],
    },
  },
  {
    timestamps: true,
  }
);

attendanceSchema.index({ student: 1, class: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);