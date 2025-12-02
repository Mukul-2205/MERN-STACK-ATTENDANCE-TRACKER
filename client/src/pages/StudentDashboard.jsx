import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const StudentDashboard = () => {
  const [classCode, setClassCode] = useState('');
  const [joinedClasses, setJoinedClasses] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [classAttendanceStats, setClassAttendanceStats] = useState({});
  const [loading, setLoading] = useState(true);
  const { logout } = useAuth();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [classesRes, attendanceRes] = await Promise.all([
        api.get('/classes/my-classes'),
        api.get('/classes/my-attendance'),
      ]);
      setJoinedClasses(classesRes.data);
      setAttendance(attendanceRes.data);
      
      // Calculate attendance percentage for each class
      const stats = {};
      attendanceRes.data.forEach(record => {
        if (!stats[record.class._id]) {
          stats[record.class._id] = {
            classId: record.class._id,
            className: record.class.name,
            subject: record.class.subject,
            teacher: record.class.teacher?.name || 'Teacher',
            present: 0,
            total: 0,
            records: []
          };
        }
        stats[record.class._id].total += 1;
        stats[record.class._id].records.push(record);
        if (record.status === 'present') {
          stats[record.class._id].present += 1;
        }
      });
      
      // Calculate percentages and categorize
      Object.keys(stats).forEach(classId => {
        const stat = stats[classId];
        stat.percentage = stat.total > 0 
          ? Math.round((stat.present / stat.total) * 100) 
          : 0;
        
        // Categorize attendance status
        if (stat.percentage >= 75) {
          stat.status = 'good';
          stat.statusColor = 'text-emerald-400';
          stat.statusBg = 'bg-emerald-500/20';
          stat.statusBorder = 'border-emerald-400/40';
        } else if (stat.percentage >= 50) {
          stat.status = 'average';
          stat.statusColor = 'text-yellow-400';
          stat.statusBg = 'bg-yellow-500/20';
          stat.statusBorder = 'border-yellow-400/40';
        } else {
          stat.status = 'poor';
          stat.statusColor = 'text-red-400';
          stat.statusBg = 'bg-red-500/20';
          stat.statusBorder = 'border-red-400/40';
        }
      });
      
      setClassAttendanceStats(stats);
    } catch (error) {
      console.error('Failed to fetch data', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinClass = async (e) => {
    e.preventDefault();
    try {
      await api.post('/classes/join', { classCode });
      setClassCode('');
      alert('Successfully joined class!');
      await fetchData(); // Refresh data
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to join class');
    }
  };

  const getRecentAttendanceForClass = (classId) => {
    const stats = classAttendanceStats[classId];
    if (!stats || !stats.records) return [];
    return stats.records.slice(0, 3); // Last 3 records
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      {/* Background accents */}
      <div className="pointer-events-none fixed inset-0 opacity-70">
        <div className="absolute -top-24 -left-10 h-72 w-72 rounded-full bg-blue-500/30 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-emerald-500/25 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-6 lg:py-10">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6 lg:mb-8">
          <div>
            <h1 className="text-3xl lg:text-4xl font-semibold tracking-tight bg-gradient-to-r from-blue-400 via-sky-300 to-emerald-300 bg-clip-text text-transparent">
              Student Dashboard
            </h1>
            <p className="mt-1 text-sm text-slate-300">
              Track your attendance percentage for each subject
            </p>
          </div>
          <button
            onClick={logout}
            className="inline-flex items-center justify-center rounded-full bg-red-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-red-500/30 hover:bg-red-600 hover:shadow-red-600/40 active:scale-[0.97] transition"
          >
            Logout
          </button>
        </div>

        {/* Join class card */}
        <div className="mb-8">
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl shadow-xl shadow-slate-900/60 px-5 py-5 sm:px-6 sm:py-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-semibold">
                  Join a Class
                </h2>
                <p className="text-xs sm:text-sm text-slate-300">
                  Enter the class code shared by your teacher to join instantly.
                </p>
              </div>
              <span className="inline-flex items-center rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-200">
                Live • Student view
              </span>
            </div>

            <form
              onSubmit={handleJoinClass}
              className="flex flex-col sm:flex-row gap-3 sm:gap-4"
            >
              <input
                type="text"
                placeholder="Enter class code"
                value={classCode}
                onChange={(e) => setClassCode(e.target.value)}
                className="flex-1 rounded-lg border border-slate-600/70 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                required
              />
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-500/30 hover:brightness-110 active:scale-[0.98] transition"
              >
                Join Class
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
            {/* Main grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
              {/* My Classes with Detailed Attendance */}
              <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl shadow-xl shadow-slate-900/60 p-5 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">My Classes</h2>
                  <span className="text-xs text-slate-300">
                    {joinedClasses.length} class{joinedClasses.length === 1 ? '' : 'es'}
                  </span>
                </div>
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                  {joinedClasses.length > 0 ? (
                    joinedClasses.map((cls) => {
                      const stats = classAttendanceStats[cls._id];
                      const attendancePercentage = stats?.percentage || 0;
                      const recentAttendance = getRecentAttendanceForClass(cls._id);
                      
                      return (
                        <div
                          key={cls._id}
                          className="rounded-xl border border-slate-700/60 bg-slate-950/70 p-4 hover:border-emerald-400/60 hover:bg-slate-900/80 transition"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="text-sm sm:text-base font-semibold">
                                {cls.name}
                              </h3>
                              <p className="text-xs sm:text-sm text-slate-300 mb-3">
                                {cls.subject} • {cls.teacher?.name || 'Teacher'}
                              </p>
                              
                              {/* Attendance Percentage with Visual */}
                              <div className="mb-4">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-400">Attendance:</span>
                                    <span className={`text-sm font-bold ${stats?.statusColor || 'text-slate-300'}`}>
                                      {attendancePercentage}%
                                    </span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${stats?.statusBg || 'bg-slate-700'} ${stats?.statusColor || 'text-slate-300'} border ${stats?.statusBorder || 'border-slate-600'}`}>
                                      {stats?.status === 'good' ? 'Good' : 
                                       stats?.status === 'average' ? 'Average' : 
                                       stats?.status === 'poor' ? 'Needs Improvement' : 'No Data'}
                                    </span>
                                  </div>
                                </div>
                                
                                {/* Progress Bar */}
                                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden mb-2">
                                  <div 
                                    className={`h-full transition-all duration-700 ${
                                      attendancePercentage >= 75 ? 'bg-gradient-to-r from-emerald-500 to-teal-500' :
                                      attendancePercentage >= 50 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                                      'bg-gradient-to-r from-red-500 to-pink-500'
                                    }`}
                                    style={{ width: `${attendancePercentage}%` }}
                                  />
                                </div>
                                
                                <div className="flex justify-between text-xs text-slate-400">
                                  <span>{stats?.present || 0} present</span>
                                  <span>{stats?.total || 0} total days</span>
                                  <span>{stats?.total - stats?.present || 0} absent</span>
                                </div>
                              </div>

                              {/* Recent Attendance */}
                              {recentAttendance.length > 0 && (
                                <div className="mt-3">
                                  <div className="text-xs text-slate-400 mb-2">Recent Attendance:</div>
                                  <div className="space-y-1">
                                    {recentAttendance.map((record, index) => (
                                      <div key={index} className="flex items-center justify-between text-xs">
                                        <span className="text-slate-300">
                                          {new Date(record.date).toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric'
                                          })}
                                        </span>
                                        <span className={`px-2 py-0.5 rounded-full ${
                                          record.status === 'present' 
                                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                                            : 'bg-red-500/20 text-red-300 border border-red-500/30'
                                        }`}>
                                          {record.status}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            <div className="ml-4 text-right">
                              <div className="mb-2">
                                <p className="text-[10px] uppercase tracking-wide text-slate-400">
                                  Class code
                                </p>
                                <p className="mt-1 inline-flex rounded-full bg-slate-800/80 border border-slate-600/80 px-2.5 py-1 text-[11px] font-mono text-slate-100">
                                  {cls.classCode}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-sm text-slate-300">
                        You haven't joined any classes yet.
                      </p>
                      <p className="text-xs text-slate-400 mt-2">
                        Join a class using the form above.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* My Attendance Records */}
              <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl shadow-xl shadow-slate-900/60 p-5 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">My Attendance Records</h2>
                  {attendance.length > 0 && (
                    <span className="text-xs text-slate-300">
                      Total records: {attendance.length}
                    </span>
                  )}
                </div>

                <div className="bg-slate-950/70 rounded-xl border border-slate-700/60 overflow-hidden">
                  {attendance.length > 0 ? (
                    <div className="max-h-[500px] overflow-y-auto">
                      <table className="min-w-full text-left text-sm">
                        <thead className="sticky top-0 bg-slate-900/90 text-slate-300 text-xs uppercase tracking-wide z-10">
                          <tr>
                            <th className="px-4 py-3">Date</th>
                            <th className="px-4 py-3">Class</th>
                            <th className="px-4 py-3">Subject</th>
                            <th className="px-4 py-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/80">
                          {attendance.map((record) => (
                            <tr
                              key={record._id}
                              className="hover:bg-slate-900/80 transition"
                            >
                              <td className="px-4 py-3 text-slate-300">
                                {new Date(record.date).toLocaleDateString('en-US', {
                                  weekday: 'short',
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </td>
                              <td className="px-4 py-3 text-slate-100">
                                {record.class.name}
                              </td>
                              <td className="px-4 py-3 text-slate-300">
                                {record.class.subject}
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                                    record.status === 'present'
                                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-400/40'
                                      : 'bg-red-500/15 text-red-300 border border-red-400/40'
                                  }`}
                                >
                                  {record.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="px-4 py-8 text-center">
                      <p className="text-sm text-slate-300">
                        No attendance records found.
                      </p>
                      <p className="text-xs text-slate-400 mt-2">
                        Your teacher will mark attendance for your classes.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Summary Statistics */}
            {Object.keys(classAttendanceStats).length > 0 && (
              <div className="mt-8 backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl shadow-xl shadow-slate-900/60 p-5 sm:p-6">
                <h2 className="text-xl font-semibold mb-4">Subject-wise Attendance Summary</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.values(classAttendanceStats).map((stat) => (
                    <div 
                      key={stat.classId}
                      className={`rounded-xl border p-4 transition hover:scale-[1.02] ${
                        stat.status === 'good' ? 'border-emerald-400/30 bg-emerald-500/5' :
                        stat.status === 'average' ? 'border-yellow-400/30 bg-yellow-500/5' :
                        'border-red-400/30 bg-red-500/5'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold text-slate-100">
                          {stat.subject}
                        </h3>
                        <span className={`text-lg font-bold ${stat.statusColor}`}>
                          {stat.percentage}%
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mb-3">{stat.className}</p>
                      
                      <div className="mb-3">
                        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${
                              stat.status === 'good' ? 'bg-gradient-to-r from-emerald-500 to-teal-500' :
                              stat.status === 'average' ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                              'bg-gradient-to-r from-red-500 to-pink-500'
                            }`}
                            style={{ width: `${stat.percentage}%` }}
                          />
                        </div>
                      </div>
                      
                      <div className="flex justify-between text-xs">
                        <div className="text-center">
                          <div className="text-slate-400">Present</div>
                          <div className="font-medium text-emerald-300">{stat.present}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-slate-400">Total</div>
                          <div className="font-medium text-slate-300">{stat.total}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-slate-400">Absent</div>
                          <div className="font-medium text-red-300">{stat.total - stat.present}</div>
                        </div>
                      </div>
                      
                      <div className="mt-3 text-center">
                        <span className={`text-xs px-2 py-1 rounded-full ${stat.statusBg} ${stat.statusColor} border ${stat.statusBorder}`}>
                          {stat.status === 'good' ? 'Good Attendance' : 
                           stat.status === 'average' ? 'Average Attendance' : 
                           'Needs Improvement'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default StudentDashboard;