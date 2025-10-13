import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from 'recharts';
import {
  Users,
  BookOpen,
  TrendingUp,
  Activity,
  Clock,
  Award,
  Eye,
  Download
} from 'lucide-react';

const AnalyticsDashboard = () => {
  const [analytics, setAnalytics] = useState({
    overview: {},
    userStats: [],
    courseStats: [],
    systemHealth: {},
    instructorStats: []
  });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const [users, courses, system, instructors] = await Promise.all([
        fetch(`/api/analytics/users?range=${timeRange}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch(`/api/analytics/courses?range=${timeRange}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch(`/api/analytics/system?range=${timeRange}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch(`/api/analytics/instructors?range=${timeRange}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
      ]);

      const [usersData, coursesData, systemData, instructorsData] = await Promise.all([
        users.json(),
        courses.json(),
        system.json(),
        instructors.json()
      ]);

      setAnalytics({
        overview: {
          totalUsers: usersData.total || 0,
          activeUsers: usersData.active || 0,
          totalCourses: coursesData.total || 0,
          completionRate: coursesData.completionRate || 0
        },
        userStats: usersData.stats || [],
        courseStats: coursesData.stats || [],
        systemHealth: systemData || {},
        instructorStats: instructorsData || []
      });
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  const mockUserGrowth = [
    { name: 'Jan', users: 400, active: 240 },
    { name: 'Feb', users: 300, active: 139 },
    { name: 'Mar', users: 200, active: 980 },
    { name: 'Apr', users: 278, active: 390 },
    { name: 'May', users: 189, active: 480 },
    { name: 'Jun', users: 239, active: 380 },
    { name: 'Jul', users: 349, active: 430 }
  ];

  const mockCourseData = [
    { name: 'Programming', value: 400 },
    { name: 'Design', value: 300 },
    { name: 'Business', value: 300 },
    { name: 'Marketing', value: 200 }
  ];

  const mockEngagementData = [
    { name: 'Mon', hours: 24 },
    { name: 'Tue', hours: 13 },
    { name: 'Wed', hours: 98 },
    { name: 'Thu', hours: 39 },
    { name: 'Fri', hours: 48 },
    { name: 'Sat', hours: 38 },
    { name: 'Sun', hours: 43 }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 space-y-6"
    >
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600 mt-1">Platform insights and performance metrics</p>
        </div>
        
        <div className="flex items-center gap-4">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export Report
          </motion.button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 rounded-xl text-white"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100">Total Users</p>
              <p className="text-3xl font-bold">{analytics.overview.totalUsers?.toLocaleString()}</p>
              <p className="text-blue-100 text-sm mt-1">+12% from last month</p>
            </div>
            <Users className="w-12 h-12 text-blue-200" />
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-gradient-to-r from-green-500 to-green-600 p-6 rounded-xl text-white"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100">Active Users</p>
              <p className="text-3xl font-bold">{analytics.overview.activeUsers?.toLocaleString()}</p>
              <p className="text-green-100 text-sm mt-1">+8% from last week</p>
            </div>
            <Activity className="w-12 h-12 text-green-200" />
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-gradient-to-r from-purple-500 to-purple-600 p-6 rounded-xl text-white"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100">Total Courses</p>
              <p className="text-3xl font-bold">{analytics.overview.totalCourses}</p>
              <p className="text-purple-100 text-sm mt-1">+5 new this week</p>
            </div>
            <BookOpen className="w-12 h-12 text-purple-200" />
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-gradient-to-r from-orange-500 to-orange-600 p-6 rounded-xl text-white"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100">Completion Rate</p>
              <p className="text-3xl font-bold">{analytics.overview.completionRate}%</p>
              <p className="text-orange-100 text-sm mt-1">+3% improvement</p>
            </div>
            <Award className="w-12 h-12 text-orange-200" />
          </div>
        </motion.div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Growth Chart */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-200"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">User Growth</h3>
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={mockUserGrowth}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="users"
                stackId="1"
                stroke="#3B82F6"
                fill="#3B82F6"
                fillOpacity={0.6}
              />
              <Area
                type="monotone"
                dataKey="active"
                stackId="1"
                stroke="#10B981"
                fill="#10B981"
                fillOpacity={0.6}
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Course Categories */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-200"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Course Categories</h3>
            <Eye className="w-5 h-5 text-blue-500" />
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={mockCourseData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {mockCourseData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>
      </div> 
     {/* Engagement and System Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Engagement */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-200"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Weekly Engagement</h3>
            <Clock className="w-5 h-5 text-purple-500" />
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={mockEngagementData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="hours" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* System Health */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-200"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-6">System Health</h3>
          
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-600">API Uptime</span>
                <span className="text-sm font-bold text-green-600">99.9%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: '99.9%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-600">Response Time</span>
                <span className="text-sm font-bold text-blue-600">120ms</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: '85%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-600">Memory Usage</span>
                <span className="text-sm font-bold text-yellow-600">68%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '68%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-600">Storage</span>
                <span className="text-sm font-bold text-purple-600">45%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-purple-500 h-2 rounded-full" style={{ width: '45%' }}></div>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-green-50 rounded-lg">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              <span className="text-sm font-medium text-green-800">All systems operational</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Top Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Courses */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-200"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Top Performing Courses</h3>
          
          <div className="space-y-4">
            {[
              { name: 'React Fundamentals', enrollments: 1234, rating: 4.8 },
              { name: 'Python for Beginners', enrollments: 987, rating: 4.7 },
              { name: 'UI/UX Design Basics', enrollments: 756, rating: 4.9 },
              { name: 'JavaScript Advanced', enrollments: 654, rating: 4.6 },
              { name: 'Data Science Intro', enrollments: 543, rating: 4.5 }
            ].map((course, index) => (
              <motion.div
                key={course.name}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <div className="font-medium text-gray-900">{course.name}</div>
                  <div className="text-sm text-gray-500">{course.enrollments} enrollments</div>
                </div>
                <div className="flex items-center">
                  <div className="flex text-yellow-400 mr-2">
                    {'★'.repeat(Math.floor(course.rating))}
                  </div>
                  <span className="text-sm font-medium text-gray-600">{course.rating}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Top Instructors */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-200"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Top Instructors</h3>
          
          <div className="space-y-4">
            {[
              { name: 'Sarah Johnson', courses: 12, students: 3456, rating: 4.9 },
              { name: 'Mike Chen', courses: 8, students: 2134, rating: 4.8 },
              { name: 'Emily Davis', courses: 15, students: 1987, rating: 4.7 },
              { name: 'David Wilson', courses: 6, students: 1654, rating: 4.8 },
              { name: 'Lisa Anderson', courses: 9, students: 1432, rating: 4.6 }
            ].map((instructor, index) => (
              <motion.div
                key={instructor.name}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                    <span className="text-blue-600 font-medium">
                      {instructor.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{instructor.name}</div>
                    <div className="text-sm text-gray-500">
                      {instructor.courses} courses • {instructor.students} students
                    </div>
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="flex text-yellow-400 mr-2">
                    {'★'.repeat(Math.floor(instructor.rating))}
                  </div>
                  <span className="text-sm font-medium text-gray-600">{instructor.rating}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-6 rounded-xl shadow-sm border border-gray-200"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Recent Platform Activity</h3>
        
        <div className="space-y-4">
          {[
            { action: 'New user registration', user: 'john.doe@email.com', time: '2 minutes ago', type: 'user' },
            { action: 'Course published', user: 'Sarah Johnson', time: '15 minutes ago', type: 'course' },
            { action: 'Assignment submitted', user: 'Mike Chen', time: '32 minutes ago', type: 'assignment' },
            { action: 'New instructor approved', user: 'Emily Davis', time: '1 hour ago', type: 'instructor' },
            { action: 'Course completed', user: 'david.wilson@email.com', time: '2 hours ago', type: 'completion' }
          ].map((activity, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <div className="flex items-center">
                <div className={`w-2 h-2 rounded-full mr-3 ${
                  activity.type === 'user' ? 'bg-blue-500' :
                  activity.type === 'course' ? 'bg-green-500' :
                  activity.type === 'assignment' ? 'bg-yellow-500' :
                  activity.type === 'instructor' ? 'bg-purple-500' :
                  'bg-orange-500'
                }`}></div>
                <div>
                  <div className="font-medium text-gray-900">{activity.action}</div>
                  <div className="text-sm text-gray-500">{activity.user}</div>
                </div>
              </div>
              <div className="text-sm text-gray-500">{activity.time}</div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {loading && (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}
    </motion.div>
  );
};

export default AnalyticsDashboard;