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
import TransactionCharts from "../components/TransactionCharts";
import { motion } from "framer-motion";

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

  // Prepare data for TransactionCharts component
  const personalStats = [
    { value: totalBooksBorrowed, label: "Total Books Borrowed", bgColor: "bg-white" },
    { value: currentlyBorrowed, label: "Currently Borrowed", bgColor: "bg-blue-50" },
    { value: overdueBooks, label: "Overdue Books", bgColor: "bg-red-50" },
    { value: totalFines, label: "Total Fines", bgColor: "bg-yellow-50", prefix: "₹" },
  ];

  const personalCharts = [
    {
      type: 'pie',
      title: 'Transaction Actions',
      data: [
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
      ].filter(item => item.value > 0),
    },
    {
      type: 'bar',
      title: 'Monthly Activity (Last 6 Months)',
      data: Object.values(transactions.reduce((acc, transaction) => {
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
      }, {}))
        .sort((a, b) => a.month.localeCompare(b.month))
        .slice(-6),
      xDataKey: 'month',
      xTickFormatter: (value) => {
        const [year, month] = value.split('-');
        return `${month}/${year.slice(2)}`;
      },
      tooltipLabelFormatter: (value) => {
        const [year, month] = value.split('-');
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${monthNames[parseInt(month) - 1]} ${year}`;
      },
      bars: [
        { dataKey: 'issues', stackId: 'a', fill: '#3B82F6', name: 'Issues' },
        { dataKey: 'returns', stackId: 'a', fill: '#10B981', name: 'Returns' },
        { dataKey: 'renewals', stackId: 'a', fill: '#F59E0B', name: 'Renewals' },
      ],
    },
  ];

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
            <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-3">
              <button
                onClick={handleExportPDF}
                disabled={transactions.length === 0}
                className="group flex items-center justify-center px-5 py-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none disabled:shadow-md w-full sm:w-auto font-medium cursor-pointer"
              >
                <Download className="w-4 h-4 mr-2 group-hover:animate-bounce" />
                Export PDF
              </button>
              <button
                onClick={handleExportCSV}
                disabled={transactions.length === 0}
                className="group flex items-center justify-center px-5 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none disabled:shadow-md w-full sm:w-auto font-medium cursor-pointer"
              >
                <Download className="w-4 h-4 mr-2 group-hover:animate-bounce" />
                Export CSV
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Personal Statistics & Charts */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <TransactionCharts
          stats={personalStats}
          charts={personalCharts}
        />
      </motion.div>

      {/* Content */}
      <motion.div
        className="max-w-7xl mx-auto px-4 py-8"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        viewport={{ once: true }}
      >
        {transactions.length === 0 ? (
          <motion.div
            className="bg-white rounded-lg shadow-md p-6 sm:p-12 text-center"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            </motion.div>
            <motion.h3
              className="text-xl font-semibold text-gray-900 mb-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
            >
              No Transactions Yet
            </motion.h3>
            <motion.p
              className="text-gray-600 mb-6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.7 }}
            >
              You haven't borrowed any books yet. Start exploring our
              collection!
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.8 }}
            >
              <Link
                to="/books"
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
              >
                <BookOpen className="w-5 h-5 mr-2" />
                Browse Books
              </Link>
            </motion.div>
          </motion.div>
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
                    <motion.tr
                      key={index}
                      className="hover:bg-gray-50"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      whileHover={{ scale: 1.01, backgroundColor: "#f9fafb" }}
                    >
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
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
