import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  loginTime: {
    type: Date,
    default: null,
  },
  logoutTime: {
    type: Date,
    default: null,
  },
  breaks: [
    {
      startTime: {
        type: Date,
        required: true,
      },
      endTime: {
        type: Date,
        default: null,
      },
      durationMinutes: {
        type: Number,
        default: 0,
      }
    }
  ],
  totalWorkMinutes: {
    type: Number,
    default: 0,
  },
  totalBreakMinutes: {
    type: Number,
    default: 0,
  }
}, { timestamps: true });

export default mongoose.model('Attendance', attendanceSchema);
