import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import AttendanceModal from '../components/AttendanceModal';
import AttendanceHistoryModal from '../components/AttendanceHistoryModal';

const TeacherDashboard = () => {
  const [classes, setClasses] = useState([]);
  const [className, setClassName] = useState('');
  const [subject, setSubject] = useState('');
  const [selectedClass, setSelectedClass] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [classStats, setClassStats] = useState({});
  const [loading, setLoading] = useState(true);
  const { logout } = useAuth();

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/classes/my-classes');
      setClasses(data);
      
      // Fetch statistics for each class
      const statsPromises = data.map(async (cls) => {
        try {
          const { data: statsData } = await api.get(`/classes/${cls._id}/details`);
          return { classId: cls._id, stats: statsData.statistics };
        } catch (error) {
          console.error('Failed to fetch stats for class', cls._id, error);
          return { classId: cls._id, stats: null };
        }
      });
      
      const statsResults = await Promise.all(statsPromises);
      const statsMap = {};
      statsResults.forEach(result => {
        statsMap[result.classId] = result.stats;
      });
      setClassStats(statsMap);
    } catch (error) {
      console.error('Failed to fetch classes', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClass = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post('/classes', { 
        name: className, 
        subject 
      });
      
      // Fetch the new class with populated students
      const { data: newClassWithDetails } = await api.get(`/classes/${data._id}/details`);
      
      setClasses([...classes, newClassWithDetails.class]);
      
      // Set stats for the new class
      setClassStats(prev => ({
        ...prev,
        [data._id]: newClassWithDetails.statistics
      }));
      
      setClassName('');
      setSubject('');
      alert('Class created successfully!');
    } catch (error) {
      console.error('Failed to create class', error);
      alert(error.response?.data?.message || 'Failed to create class');
    }
  };

  const openAttendanceModal = async (classItem) => {
    // Ensure class has populated students
    if (!classItem.students || classItem.students.length === 0) {
      try {
        const { data } = await api.get(`/classes/${classItem._id}/details`);
        setSelectedClass(data.class);
      } catch (error) {
        console.error('Failed to fetch class details', error);
        setSelectedClass(classItem);
      }
    } else {
      setSelectedClass(classItem);
    }
    setIsModalOpen(true);
  };

  const openAttendanceHistory = async (classItem) => {
    setSelectedClass(classItem);
    setIsHistoryModalOpen(true);
  };

  const handleAttendanceModalClose = (classId) => {
    setIsModalOpen(false);
    if (classId) {
      fetchClasses(); // Refresh all data
    }
  };

  const getAttendanceStatusColor = (percentage) => {
    if (percentage >= 75) return 'text-emerald-400';
    if (percentage >= 50) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getAttendanceBorderColor = (percentage) => {
    if (percentage >= 75) return 'border-emerald-500';
    if (percentage >= 50) return 'border-yellow-500';
    return 'border-red-500';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      {/* Background accents */}
      <div className="pointer-events-none fixed inset-0 opacity-70">
        <div className="absolute -top-24 left-0 h-72 w-72 rounded-full bg-indigo-500/30 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-emerald-500/25 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-6 lg:py-10">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6 lg:mb-8">
          <div>
            <h1 className="text-3xl lg:text-4xl font-semibold tracking-tight bg-gradient-to-r from-indigo-400 via-sky-300 to-emerald-300 bg-clip-text text-transparent">
              Teacher Dashboard
            </h1>
            <p className="mt-1 text-sm text-slate-300">
              Create classes, manage attendance, and track student percentages
            </p>
          </div>
          <button
            onClick={logout}
            className="inline-flex items-center justify-center rounded-full bg-red-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-red-500/30 hover:bg-red-600 hover:shadow-red-600/40 active:scale-[0.97] transition"
          >
            Logout
          </button>
        </div>

        {/* Create class card */}
        <div className="mb-8">
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl shadow-xl shadow-slate-900/60 px-5 py-5 sm:px-6 sm:py-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-semibold">
                  Create New Class
                </h2>
                <p className="text-xs sm:text-sm text-slate-300">
                  Set up a class, add its subject, and start managing students.
                </p>
              </div>
              <span className="inline-flex items-center rounded-full border border-indigo-400/40 bg-indigo-400/10 px-3 py-1 text-xs font-medium text-indigo-200">
                Step 1 • Create class
              </span>
            </div>

            <form
              onSubmit={handleCreateClass}
              className="flex flex-col sm:flex-row gap-3 sm:gap-4"
            >
              <input
                type="text"
                placeholder="Class name (e.g., Grade 10 - A)"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                className="flex-1 rounded-lg border border-slate-600/70 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                required
              />
              <input
                type="text"
                placeholder="Subject (e.g., Mathematics)"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="flex-1 rounded-lg border border-slate-600/70 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                required
              />
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-500/30 hover:brightness-110 active:scale-[0.98] transition"
              >
                Create Class
              </button>
            </form>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
          </div>
        ) : (
          <>
            {/* Class cards grid */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-semibold">My Classes</h2>
                <span className="text-xs text-slate-300">
                  {classes.length} class{classes.length === 1 ? '' : 'es'} created
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
                {classes.map((cls) => {
                  const stats = classStats[cls._id];
                  const attendancePercentage = stats?.attendancePercentage || 0;
                  const totalStudents = cls.students?.length || 0;
                  const studentAttendance = stats?.studentAttendance || [];
                  
                  // Find students with low attendance (< 50%)
                  const lowAttendanceStudents = studentAttendance.filter(
                    student => student.attendancePercentage < 50
                  ).length;
                  
                  return (
                    <div
                      key={cls._id}
                      className="backdrop-blur-xl bg-white/7 border border-white/15 rounded-2xl shadow-xl shadow-slate-900/60 p-5 flex flex-col justify-between hover:border-emerald-400/50 hover:bg-white/10 hover:shadow-2xl transition"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-semibold text-slate-50">
                            {cls.name}
                          </h3>
                          <p className="text-sm text-slate-300">{cls.subject}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[11px] uppercase tracking-wide text-slate-400">
                            Class code
                          </p>
                          <p className="mt-1 inline-flex rounded-full bg-slate-900/70 border border-slate-600/80 px-2.5 py-1 text-[11px] font-mono text-slate-100">
                            {cls.classCode}
                          </p>
                        </div>
                      </div>

                      {/* Attendance Percentage Circle */}
                      <div className="my-4 flex items-center justify-center">
                        <div className="relative">
                          <div className={`w-20 h-20 rounded-full border-4 ${getAttendanceBorderColor(attendancePercentage)} flex items-center justify-center`}>
                            <div className="text-center">
                              <div className={`text-2xl font-bold ${getAttendanceStatusColor(attendancePercentage)}`}>
                                {attendancePercentage}%
                              </div>
                              <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-1">
                                Attendance
                              </div>
                            </div>
                          </div>
                          {/* Progress circle */}
                          <div 
                            className="absolute top-0 left-0 w-20 h-20 rounded-full border-4 border-transparent"
                            style={{
                              borderTopColor: attendancePercentage >= 75 ? '#10b981' : 
                                            attendancePercentage >= 50 ? '#fbbf24' : '#ef4444',
                              borderRightColor: attendancePercentage >= 75 ? '#10b981' : 
                                              attendancePercentage >= 50 ? '#fbbf24' : '#ef4444',
                              transform: `rotate(${attendancePercentage * 3.6}deg)`
                            }}
                          />
                        </div>
                      </div>

                      {/* Class Statistics */}
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">Total Students:</span>
                          <span className="font-medium text-emerald-300">{totalStudents}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">Attendance Rate:</span>
                          <span className={`font-medium ${getAttendanceStatusColor(attendancePercentage)}`}>
                            {attendancePercentage}%
                          </span>
                        </div>
                        {lowAttendanceStudents > 0 && (
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-400">Low Attendance:</span>
                            <span className="font-medium text-red-300">{lowAttendanceStudents} students</span>
                          </div>
                        )}
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">Total Records:</span>
                          <span className="font-medium text-slate-300">{stats?.overallStats?.total || 0}</span>
                        </div>
                      </div>

                      <div className="mt-5 flex gap-2">
                        <button
                          onClick={() => openAttendanceModal(cls)}
                          className="flex-1 inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/30 hover:brightness-110 active:scale-[0.98] transition"
                        >
                          Mark Attendance
                        </button>
                        <button
                          onClick={() => openAttendanceHistory(cls)}
                          className="inline-flex items-center justify-center rounded-lg border border-slate-600/70 bg-slate-800/50 px-3 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-700/70 hover:border-slate-500/70 active:scale-[0.98] transition"
                          title="View attendance history"
                        >
                          📊
                        </button>
                      </div>
                    </div>
                  );
                })}

                {classes.length === 0 && (
                  <div className="col-span-full text-sm text-slate-300 bg-slate-950/60 border border-dashed border-slate-600/70 rounded-2xl px-4 py-6 text-center">
                    No classes yet. Create your first class above to start adding subjects and managing student attendance.
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {isModalOpen && selectedClass && (
          <AttendanceModal
            classItem={selectedClass}
            onClose={() => handleAttendanceModalClose(selectedClass._id)}
          />
        )}

        {isHistoryModalOpen && selectedClass && (
          <AttendanceHistoryModal
            classItem={selectedClass}
            onClose={() => setIsHistoryModalOpen(false)}
          />
        )}
      </div>
    </div>
  );
};

export default TeacherDashboard;