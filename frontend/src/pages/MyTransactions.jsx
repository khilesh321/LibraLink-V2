import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../supabase/supabaseClient";
import useUserRole from "../supabase/useUserRole";
import { toast } from "react-toastify";
import {
  BookOpen,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle,
  Download,
} from "lucide-react";
import {
  generateTransactionsPDF,
  generateTransactionsCSV,
} from "../utils/pdfUtils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

export default function MyTransactions() {
  const { role, loading: roleLoading } = useUserRole();
  const [transactions, setTransactions] = useState([]);
  const [books, setBooks] = useState({});
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (!roleLoading) {
      if (!role) {
        // Redirect to login if not authenticated
        window.location.href = "/login";
        return;
      }
      fetchUserAndTransactions();
    }
  }, [roleLoading, role]);

  const fetchUserAndTransactions = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      setUser(user);

      // Fetch user's transactions
      const { data: transactionsData, error: transactionsError } =
        await supabase
          .from("book_transactions")
          .select("*")
          .eq("user_id", user.id)
          .order("transaction_date", { ascending: false });

      if (transactionsError) throw transactionsError;

      console.log("User transactions:", transactionsData);
      setTransactions(transactionsData || []);

      // Fetch book details for the transactions
      const bookIds = [
        ...new Set(transactionsData?.map((t) => t.book_id) || []),
      ];
      console.log("Book IDs for user transactions:", bookIds);
      if (bookIds.length > 0) {
        const { data: booksData, error: booksError } = await supabase
          .from("books")
          .select("id, title, author, description")
          .in("id", bookIds);

        console.log("Books data for user:", booksData);
        if (booksError) {
          console.error("Error fetching books for user:", booksError);
        } else {
          const booksMap = {};
          booksData?.forEach((book) => {
            booksMap[book.id] = book;
          });
          setBooks(booksMap);
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action) => {
    switch (action) {
      case "issue":
        return <BookOpen className="w-5 h-5 text-blue-600" />;
      case "return":
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "renew":
        return <Clock className="w-5 h-5 text-orange-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-600" />;
    }
  };

  const getActionColor = (action) => {
    switch (action) {
      case "issue":
        return "bg-blue-100 text-blue-800";
      case "return":
        return "bg-green-100 text-green-800";
      case "renew":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const calculateLateFees = (transaction) => {
    // Only calculate fees for issued books that are overdue
    if (transaction.action !== "issue" || !transaction.due_date) {
      return 0;
    }

    const dueDate = new Date(transaction.due_date);
    const today = new Date();

    // Check if the book is still issued (no return transaction after this issue)
    const transactionIndex = transactions.findIndex((t) => t === transaction);
    const subsequentTransactions = transactions.slice(0, transactionIndex);
    const hasReturn = subsequentTransactions.some(
      (t) => t.book_id === transaction.book_id && t.action === "return"
    );

    // If book has been returned, no late fees
    if (hasReturn) {
      return 0;
    }

    // If due date is in the future, no late fees
    if (dueDate > today) {
      return 0;
    }

    // Calculate days overdue
    const timeDiff = today.getTime() - dueDate.getTime();
    const daysOverdue = Math.ceil(timeDiff / (1000 * 3600 * 24));

    // 5 rupees per day
    return daysOverdue * 5;
  };

  const handleExportPDF = async () => {
    try {
      await generateTransactionsPDF(
        transactions,
        books,
        {}, // No users data for personal transactions
        "My Transaction History",
        user
      );
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast.error("Failed to export PDF. Please try again.");
    }
  };

  const handleExportCSV = () => {
    try {
      generateTransactionsCSV(
        transactions,
        books,
        {}, // No users data for personal transactions
        "My Transaction History",
        user
      );
    } catch (error) {
      console.error("Error exporting CSV:", error);
      toast.error("Failed to export CSV. Please try again.");
    }
  };

  // Calculate chart data
  const actionChartData = [
    {
      name: "Issues",
      value: transactions.filter((t) => t.action === "issue").length,
      color: "#3B82F6"
    },
    {
      name: "Returns",
      value: transactions.filter((t) => t.action === "return").length,
      color: "#10B981"
    },
    {
      name: "Renewals",
      value: transactions.filter((t) => t.action === "renew").length,
      color: "#F59E0B"
    },
  ].filter(item => item.value > 0); // Only show actions that have transactions

  // Calculate monthly activity data
  const monthlyData = transactions.reduce((acc, transaction) => {
    const date = new Date(transaction.transaction_date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    if (!acc[monthKey]) {
      acc[monthKey] = {
        month: monthKey,
        issues: 0,
        returns: 0,
        renewals: 0,
        total: 0
      };
    }

    acc[monthKey][transaction.action + 's']++;
    acc[monthKey].total++;

    return acc;
  }, {});

  const monthlyChartData = Object.values(monthlyData)
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-6); // Show last 6 months

  // Calculate personal statistics
  const overdueBooks = transactions.filter((transaction) => {
    if (transaction.action !== "issue" || !transaction.due_date) return false;

    const dueDate = new Date(transaction.due_date);
    const today = new Date();

    // Check if the book is still issued (no return transaction after this issue)
    const transactionIndex = transactions.findIndex((t) => t === transaction);
    const subsequentTransactions = transactions.slice(0, transactionIndex);
    const hasReturn = subsequentTransactions.some(
      (t) => t.book_id === transaction.book_id && t.action === "return"
    );

    // Book is overdue if not returned and due date has passed
    return !hasReturn && dueDate < today;
  }).length;

  const totalBooksBorrowed = new Set(
    transactions.filter(t => t.action === "issue").map(t => t.book_id)
  ).size;

  const currentlyBorrowed = transactions.filter((transaction) => {
    if (transaction.action !== "issue") return false;

    // Check if this book has been returned
    const transactionIndex = transactions.findIndex((t) => t === transaction);
    const subsequentTransactions = transactions.slice(0, transactionIndex);
    const hasReturn = subsequentTransactions.some(
      (t) => t.book_id === transaction.book_id && t.action === "return"
    );

    return !hasReturn;
  }).length;

  const totalFines = transactions.reduce((total, transaction) => {
    return total + calculateLateFees(transaction);
  }, 0);

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your transactions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                My Transactions
              </h1>
              <p className="text-gray-600">View your book borrowing history</p>
            </div>
            <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4">
              <button
                onClick={handleExportPDF}
                disabled={transactions.length === 0}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors w-full sm:w-auto"
              >
                <Download className="w-4 h-4 mr-2" />
                Export PDF
              </button>
              <button
                onClick={handleExportCSV}
                disabled={transactions.length === 0}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors w-full sm:w-auto"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Personal Statistics & Charts */}
      {transactions.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 py-6">
          {/* Personal Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">
                {totalBooksBorrowed}
              </div>
              <div className="text-sm text-gray-600">Total Books Borrowed</div>
            </div>
            <div className="bg-blue-50 rounded-lg shadow p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {currentlyBorrowed}
              </div>
              <div className="text-sm text-gray-600">Currently Borrowed</div>
            </div>
            <div className="bg-red-50 rounded-lg shadow p-4 text-center">
              <div className="text-2xl font-bold text-red-600">
                {overdueBooks}
              </div>
              <div className="text-sm text-gray-600">Overdue Books</div>
            </div>
            <div className="bg-yellow-50 rounded-lg shadow p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600">
                ₹{totalFines}
              </div>
              <div className="text-sm text-gray-600">Total Fines</div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Transaction Actions Pie Chart */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Transaction Actions
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={actionChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {actionChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Monthly Activity Bar Chart */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Monthly Activity (Last 6 Months)
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="month"
                    tickFormatter={(value) => {
                      const [year, month] = value.split('-');
                      return `${month}/${year.slice(2)}`;
                    }}
                  />
                  <YAxis />
                  <Tooltip
                    labelFormatter={(value) => {
                      const [year, month] = value.split('-');
                      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                                        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                      return `${monthNames[parseInt(month) - 1]} ${year}`;
                    }}
                  />
                  <Legend />
                  <Bar dataKey="issues" stackId="a" fill="#3B82F6" name="Issues" />
                  <Bar dataKey="returns" stackId="a" fill="#10B981" name="Returns" />
                  <Bar dataKey="renewals" stackId="a" fill="#F59E0B" name="Renewals" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {transactions.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-6 sm:p-12 text-center">
            <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No Transactions Yet
            </h3>
            <p className="text-gray-600 mb-6">
              You haven't borrowed any books yet. Start exploring our
              collection!
            </p>
            <Link
              to="/books"
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <BookOpen className="w-5 h-5 mr-2" />
              Browse Books
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Transaction History ({transactions.length})
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Book Details
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Transaction Date
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Due Date
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Late Fees
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {transactions.map((transaction, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getActionIcon(transaction.action)}
                          <span
                            className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getActionColor(
                              transaction.action
                            )}`}
                          >
                            {transaction.action.charAt(0).toUpperCase() +
                              transaction.action.slice(1)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          📖{" "}
                          {books[transaction.book_id]?.title || "Unknown Book"}
                        </div>
                        <div className="hidden sm:block text-sm text-gray-600">
                          Book ID: {transaction.book_id}
                        </div>
                        <div className="text-sm text-gray-500">
                          {books[transaction.book_id]?.author &&
                            `by ${books[transaction.book_id].author}`}
                        </div>
                        {/* {books[transaction.book_id]?.description && (
                          <div className="text-xs text-gray-400">
                            {books[transaction.book_id].description}
                          </div>
                        )} */}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1 text-gray-400" />
                          {formatDate(transaction.transaction_date)}
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {transaction.due_date ? (
                          <div className="flex items-center">
                            <Clock className="w-4 h-4 mr-1 text-gray-400" />
                            {formatDate(transaction.due_date)}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm">
                        {(() => {
                          const fees = calculateLateFees(transaction);
                          return fees > 0 ? (
                            <span className="text-red-600 font-semibold">
                              ₹{fees}
                            </span>
                          ) : (
                            <span className="text-green-600">-</span>
                          );
                        })()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
