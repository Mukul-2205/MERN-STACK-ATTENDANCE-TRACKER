import { useState, useEffect } from 'react';
import api from '../services/api';

const AttendanceHistoryModal = ({ classItem, onClose }) => {
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({});

  useEffect(() => {
    fetchAttendanceRecords();
    // Get students from the classItem prop directly
    if (classItem.students && classItem.students.length > 0) {
      setStudents(classItem.students);
    } else {
      // If students are not populated, fetch them from the class details
      fetchClassStudents();
    }
  }, [classItem._id]);

  const fetchAttendanceRecords = async (page = 1) => {
    try {
      setLoading(true);
      const params = { page, limit: 10 };
      if (selectedDate) params.date = selectedDate;
      if (selectedStudent) params.studentId = selectedStudent;

      const { data } = await api.get(`/classes/${classItem._id}/attendance-records`, { params });
      setAttendanceRecords(data.attendance);
      setFilteredRecords(data.attendance);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Failed to fetch attendance records', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClassStudents = async () => {
    try {
      const { data } = await api.get(`/classes/${classItem._id}/details`);
      setStudents(data.class.students || []);
    } catch (error) {
      console.error('Failed to fetch students', error);
    }
  };

  const handleFilter = () => {
    fetchAttendanceRecords(1);
  };

  const handleReset = () => {
    setSelectedDate('');
    setSelectedStudent('');
    fetchAttendanceRecords(1);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm px-4">
      <div className="w-full max-w-5xl max-h-[90vh] rounded-2xl border border-white/15 bg-slate-900/80 bg-clip-padding shadow-2xl shadow-slate-900/70 backdrop-blur-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/70">
          <div>
            <h2 className="text-xl font-semibold text-slate-50">
              Attendance History - {classItem.name}
            </h2>
            <p className="text-xs text-slate-300">
              {classItem.subject} • {students.length} students
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-800/80 text-slate-300 hover:bg-slate-700/90 hover:text-slate-100 transition"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Filters */}
        <div className="px-6 py-4 border-b border-slate-800/80">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Filter by Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full rounded-lg border border-slate-600/70 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Filter by Student
              </label>
              <select
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
                className="w-full rounded-lg border border-slate-600/70 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
              >
                <option value="">All Students</option>
                {students.map(student => (
                  <option key={student._id || student} value={student._id || student}>
                    {typeof student === 'object' ? student.name : `Student ID: ${student}`}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={handleFilter}
                className="rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-500/30 hover:brightness-110 active:scale-[0.98] transition"
              >
                Apply
              </button>
              <button
                onClick={handleReset}
                className="rounded-lg border border-slate-600/70 bg-slate-800/50 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-700/70 hover:border-slate-500/70 active:scale-[0.98] transition"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Attendance Records */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
            </div>
          ) : (
            <>
              {filteredRecords.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-slate-300">No attendance records found.</p>
                  <p className="text-sm text-slate-400 mt-2">
                    Mark attendance for today to get started.
                  </p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-slate-700/60">
                  <table className="min-w-full divide-y divide-slate-800">
                    <thead className="bg-slate-900/90">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                          Student
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                          Marked At
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {filteredRecords.map((record) => (
                        <tr key={record._id} className="hover:bg-slate-800/50 transition">
                          <td className="px-4 py-3 text-sm text-slate-300">
                            {formatDate(record.date)}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-100">
                            {record.student?.name || 'Unknown Student'}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                              record.status === 'present'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-red-500/20 text-red-300 border border-red-500/30'
                            }`}>
                              {record.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-400">
                            {new Date(record.createdAt).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>

        {/* Pagination */}
        {pagination.total > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800/80">
            <div className="text-sm text-slate-400">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
              {pagination.total} records
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => fetchAttendanceRecords(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="rounded-lg border border-slate-600/70 bg-slate-800/50 px-3 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700/70 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Previous
              </button>
              <button
                onClick={() => fetchAttendanceRecords(pagination.page + 1)}
                disabled={pagination.page >= pagination.pages}
                className="rounded-lg border border-slate-600/70 bg-slate-800/50 px-3 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700/70 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceHistoryModal;