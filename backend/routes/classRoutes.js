const express = require('express');
const { protect, authorize } = require('../middleware/authMiddleware');
const { 
  createClass, 
  joinClass, 
  getMyClasses, 
  markAttendance, 
  getAttendanceForClass, 
  getMyAttendance,
  getStudentAttendanceHistory,
  getClassDetails, 
  getAttendanceRecords 
} = require('../controllers/classController');

const router = express.Router();

// Public routes (if any)

// Protected routes
router.use(protect);

// Specific routes first
router.post('/', authorize('teacher'), createClass);
router.post('/join', authorize('student'), joinClass);
router.post('/mark-attendance', authorize('teacher'), markAttendance);
router.get('/my-classes', getMyClasses);
router.get('/my-attendance', authorize('student'), getMyAttendance);

// Class ID routes
router.get('/:classId/attendance', authorize('teacher'), getAttendanceForClass);
router.get('/:classId/student-attendance/:studentId', getStudentAttendanceHistory);
router.get('/:classId/details', getClassDetails);
router.get('/:classId/attendance-records', getAttendanceRecords);

module.exports = router;