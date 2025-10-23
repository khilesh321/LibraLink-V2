import { useState, useEffect } from "react";
import { supabase } from "../supabase/supabaseClient";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";

export default function AnalyticsDashboard() {
  const [monthlyBorrowData, setMonthlyBorrowData] = useState([]);
  const [bookData, setBookData] = useState([]);
  const [userData, setUserData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchMonthlyBorrowTrend(),
        fetchTopBooks(),
        fetchMostActiveUsers(),
      ]);
    } catch (error) {
      console.error("Error fetching analytics data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMonthlyBorrowTrend = async () => {
    try {
      // Get borrow records for the last 12 months
      const { data: borrowRecords, error } = await supabase
        .from("book_transactions")
        .select("transaction_date")
        .eq("action", "issue")
        .gte("transaction_date", new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString())
        .order("transaction_date", { ascending: true });

      if (error) throw error;

      // Process data to group by month
      const monthlyData = {};
      const monthNames = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
      ];

      borrowRecords?.forEach((record) => {
        const date = new Date(record.transaction_date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthName = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;

        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { month: monthName, borrows: 0 };
        }
        monthlyData[monthKey].borrows += 1;
      });

      // Convert to array and sort by date
      const sortedData = Object.values(monthlyData).sort((a, b) => {
        const aDate = new Date(a.month);
        const bDate = new Date(b.month);
        return aDate - bDate;
      });

      setMonthlyBorrowData(sortedData);
    } catch (error) {
      console.error("Error fetching monthly borrow trend:", error);
      setMonthlyBorrowData([]);
    }
  };

  const fetchTopBooks = async () => {
    try {
      // Get borrow records with book information - fetch separately and map
      const { data: borrowRecords, error } = await supabase
        .from("book_transactions")
        .select("book_id")
        .eq("action", "issue");

      if (error) throw error;

      // Get unique book IDs
      const bookIds = [...new Set(borrowRecords?.map((record) => record.book_id) || [])];

      if (bookIds.length === 0) {
        setBookData([]);
        return;
      }

      // Fetch book details for these IDs
      const { data: booksData, error: booksError } = await supabase
        .from("books")
        .select("id, title")
        .in("id", bookIds);

      if (booksError) throw booksError;

      // Count borrows by book title
      const bookCount = {};
      borrowRecords?.forEach((record) => {
        const book = booksData?.find((b) => b.id === record.book_id);
        const title = book?.title || "Unknown Book";
        bookCount[title] = (bookCount[title] || 0) + 1;
      });

      // Get top 10 books
      const topBooks = Object.entries(bookCount)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([title, borrows]) => ({
          title: title.length > 30 ? title.slice(0, 30) + "..." : title,
          borrows,
        }));

      setBookData(topBooks);
    } catch (error) {
      console.error("Error fetching top books:", error);
      setBookData([]);
    }
  };

  const fetchMostActiveUsers = async () => {
    try {
      // Get borrow records with user information - fetch separately and map
      const { data: borrowRecords, error } = await supabase
        .from("book_transactions")
        .select("user_id")
        .eq("action", "issue");

      if (error) throw error;

      // Get unique user IDs
      const userIds = [...new Set(borrowRecords?.map((record) => record.user_id) || [])];

      if (userIds.length === 0) {
        setUserData([]);
        return;
      }

      // Fetch user details from profiles table
      const { data: usersData, error: usersError } = await supabase
        .from("profiles")
        .select("id, username")
        .in("id", userIds);

      // Count borrows by user
      const userCount = {};
      borrowRecords?.forEach((record) => {
        const user = usersData?.find((u) => u.id === record.user_id);
        const username = user?.username || `User ${record.user_id.slice(0, 8)}`;
        const userId = record.user_id;
        
        if (!userCount[username]) {
          userCount[username] = { borrows: 0, userId };
        }
        userCount[username].borrows += 1;
      });

      // Get top 10 most active users
      const topUsers = Object.entries(userCount)
        .sort(([,a], [,b]) => b.borrows - a.borrows)
        .slice(0, 10)
        .map(([username, data]) => ({
          username: username.length > 15 ? username.slice(0, 15) + "..." : username,
          borrows: data.borrows,
          userId: data.userId.slice(0, 8), // Show first 8 chars of user ID
        }));

      setUserData(topUsers);
    } catch (error) {
      console.error("Error fetching most active users:", error);
      setUserData([]);
    }
  };

  const COLORS = ["#6366f1", "#22d3ee", "#f59e0b", "#ef4444", "#10b981"];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="text-gray-900 font-medium">{`${label}`}</p>
          <p className="text-blue-600">{`Borrows: ${payload[0].value}`}</p>
        </div>
      );
    }
    return null;
  };

  const PieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="text-gray-900 font-medium">{data.name}</p>
          <p className="text-blue-600">{`Borrows: ${data.value} (${data.percentage}%)`}</p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Analytics Dashboard</h1>
          <p className="text-gray-600">Insights into library borrowing patterns and user activity</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Monthly Borrow Trend */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Monthly Borrow Trend</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyBorrowData}>
                  <defs>
                    <linearGradient id="borrowGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="month"
                    stroke="#6b7280"
                    fontSize={12}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#6b7280"
                    fontSize={12}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="borrows"
                    stroke="#6366f1"
                    strokeWidth={3}
                    dot={{ fill: "#6366f1", strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: "#6366f1", strokeWidth: 2, fill: "#ffffff" }}
                    fill="url(#borrowGradient)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Books */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Top Books</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bookData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="title"
                    stroke="#6b7280"
                    fontSize={12}
                    tickLine={false}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis
                    stroke="#6b7280"
                    fontSize={12}
                    tickLine={false}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                            <p className="text-gray-900 font-medium">{label}</p>
                            <p className="text-blue-600">{`Borrows: ${payload[0].value}`}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar
                    dataKey="borrows"
                    fill="#f59e0b"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Most Active Users */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Most Active Users</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={userData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="username"
                  stroke="#6b7280"
                  fontSize={12}
                  tickLine={false}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis
                  stroke="#6b7280"
                  fontSize={12}
                  tickLine={false}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                          <p className="text-gray-900 font-medium">{`User: ${data.username}`}</p>
                          <p className="text-sm text-gray-600">{`ID: ${data.userId}`}</p>
                          <p className="text-blue-600">{`Books Borrowed: ${payload[0].value}`}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  dataKey="borrows"
                  fill="#22d3ee"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}