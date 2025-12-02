const Class = require('../models/classModel');
const User = require('../models/userModel');
const Attendance = require('../models/attendanceModel');

const generateClassCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

// ======================= GET STUDENT ATTENDANCE HISTORY (FIXED) =======================
const getStudentAttendanceHistory = async (req, res) => {
  try {
    const { classId, studentId } = req.params;
    
    console.log('Fetching attendance history for:', { classId, studentId });
    
    const classObj = await Class.findById(classId);
    if (!classObj) {
      console.log('Class not found');
      return res.status(404).json({ message: "Class not found" });
    }

    // Authorization
    if (req.user.role === "teacher") {
      // Teacher can only access their own classes
      if (classObj.teacher.toString() !== req.user._id.toString()) {
        console.log('Teacher not authorized for this class');
        return res.status(403).json({ message: "Not authorized" });
      }
    } else if (req.user.role === "student") {
      // Student can only access their own data
      if (req.user._id.toString() !== studentId) {
        console.log('Student trying to access another student data');
        return res.status(403).json({ message: "Not allowed" });
      }
    }

    // Check if student is enrolled in the class
    const isStudentEnrolled = classObj.students.some(
      student => student.toString() === studentId
    );
    
    if (!isStudentEnrolled) {
      console.log('Student not enrolled in this class');
      return res.status(400).json({ message: "Student not enrolled in this class" });
    }

    // Fetch attendance history with date range (last 30 days by default)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const attendanceHistory = await Attendance.find({
      class: classId,
      student: studentId,
      date: { $gte: thirtyDaysAgo }
    })
    .sort({ date: -1 })
    .lean(); // Use lean() for better performance

    console.log('Found attendance records:', attendanceHistory.length);

    // Calculate statistics
    const totalRecords = attendanceHistory.length;
    const presentCount = attendanceHistory.filter(record => record.status === 'present').length;
    const attendancePercentage = totalRecords > 0 
      ? Math.round((presentCount / totalRecords) * 100) 
      : 0;

    // Get class details
    const classDetails = await Class.findById(classId)
      .select('name subject')
      .lean();

    // Get student details
    const studentDetails = await User.findById(studentId)
      .select('name email')
      .lean();

    // Format dates for better readability
    const formattedHistory = attendanceHistory.map(record => ({
      ...record,
      formattedDate: new Date(record.date).toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    }));

    res.status(200).json({
      history: formattedHistory,
      statistics: {
        totalRecords,
        presentCount,
        absentCount: totalRecords - presentCount,
        attendancePercentage,
        class: classDetails,
        student: studentDetails
      },
      dateRange: {
        from: thirtyDaysAgo.toISOString().split('T')[0],
        to: new Date().toISOString().split('T')[0]
      }
    });

  } catch (error) {
    console.error('Error in getStudentAttendanceHistory:', error);
    res.status(500).json({ 
      message: "Failed to fetch student attendance history", 
      error: error.message 
    });
  }
};

// ======================= CREATE CLASS =======================
const createClass = async (req, res) => {
  try {
    if (req.user.role !== "teacher") {
      return res.status(403).json({ message: "Only teachers can create classes" });
    }

    const { name, subject } = req.body;
    let classCode = generateClassCode();

    // Ensure class code is unique
    while (await Class.findOne({ classCode })) {
      classCode = generateClassCode();
    }

    const newClass = await Class.create({
      name,
      subject,
      classCode,
      teacher: req.user._id,
    });

    res.status(201).json(newClass);
  } catch (error) {
    res.status(500).json({ message: "Failed to create class", error: error.message });
  }
};

// ======================= JOIN CLASS =======================
const joinClass = async (req, res) => {
  try {
    if (req.user.role !== "student") {
      return res.status(403).json({ message: "Only students can join classes" });
    }

    const { classCode } = req.body;
    const studentId = req.user._id;

    const classToJoin = await Class.findOne({ classCode });

    if (!classToJoin) {
      return res.status(404).json({ message: "Invalid class code" });
    }

    // Prevent teacher from joining their own class
    if (classToJoin.teacher.toString() === studentId.toString()) {
      return res.status(400).json({ message: "Teacher cannot join their own class" });
    }

    // Prevent student from joining twice
    if (classToJoin.students.includes(studentId)) {
      return res.status(400).json({ message: "You already joined this class" });
    }

    classToJoin.students.push(studentId);
    await classToJoin.save();

    res.status(200).json({ message: "Successfully joined the class" });

  } catch (error) {
    res.status(500).json({ message: "Failed to join class", error: error.message });
  }
};

// ======================= GET MY CLASSES (WITH STUDENT POPULATION) =======================
const getMyClasses = async (req, res) => {
  try {
    if (req.user.role === "teacher") {
      const classes = await Class.find({ teacher: req.user._id })
        .populate('students', 'name email')
        .sort({ createdAt: -1 });

      return res.status(200).json(classes);
    }

    // Student - get classes where student is enrolled
    const classes = await Class.find({ students: req.user._id })
      .select('name subject classCode teacher')
      .populate('teacher', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json(classes);

  } catch (error) {
    res.status(500).json({ message: "Failed to fetch classes", error: error.message });
  }
};

// ======================= MARK ATTENDANCE =======================
const markAttendance = async (req, res) => {
  try {
    console.log("Incoming attendance request:", req.body);

    const { classId, date, attendanceData } = req.body;

    const classObj = await Class.findById(classId);
    if (!classObj) return res.status(404).json({ message: "Class not found" });

    // Verify teacher authorization
    if (classObj.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to mark attendance" });
    }

    // Convert ObjectIds to strings for comparison
    const classStudentIds = classObj.students.map(id => id.toString());

    // Validate all students belong to the class
    for (const record of attendanceData) {
      if (!classStudentIds.includes(record.studentId)) {
        return res.status(400).json({
          message: `Student ${record.studentId} not part of this class`
        });
      }
    }

    // Use bulkWrite to update or create attendance records
    const bulkOperations = attendanceData.map(record => ({
      updateOne: {
        filter: {
          student: record.studentId,
          class: classId,
          date: new Date(date),
        },
        update: {
          $set: {
            student: record.studentId,
            class: classId,
            date: new Date(date),
            status: record.status,
          },
        },
        upsert: true,
      },
    }));

    const result = await Attendance.bulkWrite(bulkOperations);

    let message = "Attendance marked successfully";
    if (result.upsertedCount > 0) {
      message = `Attendance marked successfully (${result.upsertedCount} new records, ${result.modifiedCount} updated records)`;
    }

    // Return updated attendance for the date
    const updatedAttendance = await Attendance.find({
      class: classId,
      date: new Date(date)
    }).populate('student', 'name email');

    res.status(200).json({
      message,
      attendance: updatedAttendance,
      summary: {
        date,
        totalStudents: attendanceData.length,
        present: attendanceData.filter(a => a.status === 'present').length,
        absent: attendanceData.filter(a => a.status === 'absent').length
      }
    });

  } catch (error) {
    console.log("BACKEND ERROR:", error.message);
    
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: "Duplicate attendance record detected. Please try again.",
        error: error.message 
      });
    }
    
    res.status(500).json({ 
      message: "Failed to mark attendance", 
      error: error.message 
    });
  }
};

// ======================= GET ATTENDANCE FOR CLASS =======================
const getAttendanceForClass = async (req, res) => {
  try {
    const { classId } = req.params;
    const { date } = req.query;

    const classObj = await Class.findById(classId);

    if (!classObj) {
      return res.status(404).json({ message: "Class not found" });
    }

    // Teacher can access only their classes
    if (req.user.role === "teacher" &&
      classObj.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Students can access only classes they belong to
    if (req.user.role === "student" &&
      !classObj.students.includes(req.user._id)) {
      return res.status(403).json({ message: "Not allowed" });
    }

    const query = { class: classId };

    if (date) {
      query.date = {
        $gte: new Date(date),
        $lt: new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000),
      };
    }

    const attendanceRecords = await Attendance.find(query)
      .populate('student', 'name email')
      .sort({ date: -1 });

    res.status(200).json(attendanceRecords);

  } catch (error) {
    res.status(500).json({ message: "Failed to fetch attendance", error: error.message });
  }
};

// ======================= GET MY ATTENDANCE =======================
const getMyAttendance = async (req, res) => {
  try {
    const studentId = req.user._id;

    const attendanceRecords = await Attendance.find({ student: studentId })
      .populate('class', 'name subject')
      .sort({ date: -1 });

    res.status(200).json(attendanceRecords);

  } catch (error) {
    res.status(500).json({ message: "Failed to fetch attendance", error: error.message });
  }
};

// ======================= GET CLASS DETAILS WITH STATISTICS =======================
const getClassDetails = async (req, res) => {
  try {
    const { classId } = req.params;

    const classObj = await Class.findById(classId)
      .populate('teacher', 'name email')
      .populate('students', 'name email');

    if (!classObj) {
      return res.status(404).json({ message: "Class not found" });
    }

    // Check authorization
    if (req.user.role === "teacher" &&
      classObj.teacher._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (req.user.role === "student" &&
      !classObj.students.some(s => s._id.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: "Not allowed" });
    }

    // Get attendance statistics for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const attendanceStats = await Attendance.aggregate([
      {
        $match: { 
          class: classObj._id,
          date: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: "$date",
          presentCount: {
            $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] }
          },
          totalCount: { $count: {} }
        }
      },
      {
        $sort: { _id: -1 }
      }
    ]);

    // Calculate overall attendance percentage
    let overallStats = { present: 0, total: 0 };
    attendanceStats.forEach(day => {
      overallStats.present += day.presentCount;
      overallStats.total += day.totalCount;
    });

    const attendancePercentage = overallStats.total > 0 
      ? Math.round((overallStats.present / overallStats.total) * 100) 
      : 0;

    // Get attendance by student for the last 30 days
    const studentAttendance = await Attendance.aggregate([
      {
        $match: { 
          class: classObj._id,
          date: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: "$student",
          presentDays: {
            $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] }
          },
          totalDays: { $count: {} }
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "studentInfo"
        }
      },
      {
        $unwind: "$studentInfo"
      },
      {
        $project: {
          studentId: "$_id",
          name: "$studentInfo.name",
          email: "$studentInfo.email",
          presentDays: 1,
          totalDays: 1,
          attendancePercentage: {
            $cond: [
              { $eq: ["$totalDays", 0] },
              0,
              { $multiply: [{ $divide: ["$presentDays", "$totalDays"] }, 100] }
            ]
          }
        }
      },
      {
        $sort: { "studentInfo.name": 1 }
      }
    ]);

    res.status(200).json({
      class: classObj,
      statistics: {
        totalStudents: classObj.students.length,
        attendancePercentage,
        overallStats,
        dailyStats: attendanceStats.slice(0, 30),
        studentAttendance,
        dateRange: {
          from: thirtyDaysAgo.toISOString().split('T')[0],
          to: new Date().toISOString().split('T')[0]
        }
      }
    });

  } catch (error) {
    res.status(500).json({ message: "Failed to fetch class details", error: error.message });
  }
};

// ======================= GET ATTENDANCE RECORDS WITH FILTERS =======================
const getAttendanceRecords = async (req, res) => {
  try {
    const { classId } = req.params;
    const { startDate, endDate, studentId, page = 1, limit = 20 } = req.query;

    const classObj = await Class.findById(classId);
    if (!classObj) return res.status(404).json({ message: "Class not found" });

    // Authorization check
    if (req.user.role === "teacher" &&
      classObj.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (req.user.role === "student" &&
      !classObj.students.includes(req.user._id)) {
      return res.status(403).json({ message: "Not allowed" });
    }

    const query = { class: classId };

    // Date range filter
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    // Student filter
    if (studentId) {
      query.student = studentId;
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [attendance, total] = await Promise.all([
      Attendance.find(query)
        .populate('student', 'name email')
        .sort({ date: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Attendance.countDocuments(query)
    ]);

    res.status(200).json({
      attendance,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    res.status(500).json({ message: "Failed to fetch attendance records", error: error.message });
  }
};

module.exports = {
  createClass,
  joinClass,
  getMyClasses,
  markAttendance,
  getAttendanceForClass,
  getMyAttendance,
  getStudentAttendanceHistory, // Fixed version
  getClassDetails,
  getAttendanceRecords
};