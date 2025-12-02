import { useState, useEffect } from 'react';
import api from '../services/api';

const AttendanceModal = ({ classItem, onClose }) => {
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [attendanceData, setAttendanceData] = useState([]);
  const [studentAttendanceHistory, setStudentAttendanceHistory] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    initializeAttendanceData();
    if (classItem.students && classItem.students.length > 0) {
      fetchStudentAttendanceHistory();
    }
  }, [classItem, date]);

  const initializeAttendanceData = () => {
    const students = classItem.students || [];
    setAttendanceData(
      students.map((student) => ({
        studentId: student._id || student,
        status: 'present',
      }))
    );
  };

  const fetchStudentAttendanceHistory = async () => {
    try {
      setLoading(true);
      const historyPromises = (classItem.students || []).map(async (student) => {
        try {
          const studentId = student._id || student;
          const { data } = await api.get(`/classes/${classItem._id}/student-attendance/${studentId}`);
          return { studentId, history: data };
        } catch (error) {
          console.error(`Failed to fetch history for student`, error);
          return { 
            studentId: student._id || student, 
            history: { 
              history: [], 
              statistics: { attendancePercentage: 0 } 
            } 
          };
        }
      });
      
      const results = await Promise.all(historyPromises);
      const historyMap = {};
      results.forEach(result => {
        historyMap[result.studentId] = result.history;
      });
      
      setStudentAttendanceHistory(historyMap);
    } catch (error) {
      console.error('Failed to fetch attendance history', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateAttendancePercentage = (studentId) => {
    const history = studentAttendanceHistory[studentId];
    if (!history || !history.statistics) return 0;
    return history.statistics.attendancePercentage || 0;
  };

  const getLastAttendanceStatus = (studentId) => {
    const history = studentAttendanceHistory[studentId];
    if (!history || !history.history || history.history.length === 0) {
      return 'No records';
    }
    
    const lastRecord = history.history[0];
    const lastDate = new Date(lastRecord.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
    return `${lastRecord.status} on ${lastDate}`;
  };

  const handleStatusChange = (studentId, status) => {
    setAttendanceData((prevData) =>
      prevData.map((record) =>
        record.studentId === studentId ? { ...record, status } : record
      )
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    
    try {
      setSubmitting(true);
      await api.post('/classes/mark-attendance', {
        classId: classItem._id,
        date,
        attendanceData,
      });
      alert('Attendance marked successfully!');
      onClose();
    } catch (error) {
      console.error('Failed to mark attendance', error);
      const errorMessage = error.response?.data?.message || 'Failed to mark attendance.';
      alert(`Error: ${errorMessage}`);
    } finally {
      setSubmitting(false);
    }
  };

  const maxDate = new Date().toISOString().split('T')[0];
  const students = classItem.students || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-4">
      {/* Smaller Modal Container */}
      <div className="relative w-full max-w-3xl max-h-[85vh] rounded-xl border border-gray-700 bg-gray-900 shadow-2xl flex flex-col overflow-hidden">
        
        {/* Compact Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-700 bg-gray-800">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Mark Attendance
            </h2>
            <p className="text-xs text-gray-300">
              {classItem.name} • {students.length} students
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white transition text-sm"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          {/* Compact Date Selection */}
          <div className="flex-shrink-0 px-4 py-3 border-b border-gray-800 bg-gray-850">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={date}
                  max={maxDate}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-md border border-gray-600 bg-gray-800 px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="ml-4 text-right">
                <div className="text-xs text-gray-400 mb-1">Summary</div>
                <div className="text-xs font-medium">
                  <span className="text-green-400">
                    {attendanceData.filter(a => a.status === 'present').length}P
                  </span>
                  <span className="text-gray-500 mx-1">•</span>
                  <span className="text-red-400">
                    {attendanceData.filter(a => a.status === 'absent').length}A
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Compact Students List - Limited Height */}
          <div className="flex-1 overflow-y-auto px-4 py-3" style={{ maxHeight: '55vh' }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-300">
                Students ({students.length})
              </h3>
              {loading && (
                <div className="text-xs text-blue-400 animate-pulse">
                  Loading...
                </div>
              )}
            </div>

            {students.length > 0 ? (
              <div className="space-y-2">
                {students.map((student) => {
                  const studentId = student._id || student;
                  const current = attendanceData.find(d => d.studentId === studentId);
                  const status = current?.status || 'present';
                  const attendancePercentage = calculateAttendancePercentage(studentId);
                  const lastAttendance = getLastAttendanceStatus(studentId);
                  const studentName = typeof student === 'object' ? student.name : `Student ${studentId.slice(-6)}`;

                  return (
                    <div
                      key={studentId}
                      className={`rounded-lg border px-3 py-2 ${
                        status === 'present' 
                          ? 'border-green-500/20 bg-green-500/5' 
                          : 'border-red-500/20 bg-red-500/5'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white text-sm">
                            {studentName.length > 15 ? studentName.substring(0, 15) + '...' : studentName}
                          </span>
                          <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                            attendancePercentage >= 75 ? 'bg-green-500/20 text-green-300' :
                            attendancePercentage >= 50 ? 'bg-yellow-500/20 text-yellow-300' :
                            'bg-red-500/20 text-red-300'
                          }`}>
                            {attendancePercentage}%
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="text-xs">
                          <div className="text-gray-400">Last: {lastAttendance}</div>
                        </div>
                        
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => handleStatusChange(studentId, 'present')}
                            className={`px-2.5 py-1 rounded text-xs font-medium border ${
                              status === 'present'
                                ? 'bg-green-500 text-white border-green-500'
                                : 'bg-gray-800 text-gray-300 border-gray-600 hover:border-green-400'
                            }`}
                          >
                            P
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(studentId, 'absent')}
                            className={`px-2.5 py-1 rounded text-xs font-medium border ${
                              status === 'absent'
                                ? 'bg-red-500 text-white border-red-500'
                                : 'bg-gray-800 text-gray-300 border-gray-600 hover:border-red-400'
                            }`}
                          >
                            A
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-sm text-gray-300 mb-2">
                  No students enrolled yet
                </p>
                <p className="text-xs text-gray-400">
                  Class code: <strong className="text-blue-300">{classItem.classCode}</strong>
                </p>
              </div>
            )}
          </div>

          {/* Compact Footer - ALWAYS VISIBLE */}
          <div className="flex-shrink-0 border-t border-gray-800 bg-gray-900 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-400">
                Total: 
                <span className="text-green-400 mx-1">
                  {attendanceData.filter(a => a.status === 'present').length} present
                </span>
                <span className="text-gray-500 mx-1">/</span>
                <span className="text-red-400">
                  {attendanceData.filter(a => a.status === 'absent').length} absent
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 rounded-md border border-gray-600 bg-gray-800 text-gray-200 hover:bg-gray-700 text-sm font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={students.length === 0 || submitting}
                  className="px-4 py-1.5 rounded-md bg-gradient-to-r from-blue-600 to-green-600 text-white font-semibold text-sm hover:from-blue-700 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-1">
                      <svg className="animate-spin h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </span>
                  ) : (
                    '✓ Submit'
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AttendanceModal;