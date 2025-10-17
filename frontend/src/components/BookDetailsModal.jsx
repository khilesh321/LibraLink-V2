import { useState, useEffect } from "react";
import { supabase } from "../supabase/supabaseClient";
import useUserRole from "../supabase/useUserRole";
import {
  X,
  BookOpen,
  User,
  Calendar,
  Hash,
  Star,
  CheckCircle,
  Clock,
  RotateCcw,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "react-toastify";

export default function BookDetailsModal({ bookId, isOpen, onClose }) {
  const { role, loading: roleLoading } = useUserRole();
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(false);
  const [availability, setAvailability] = useState(null);
  const [ratings, setRatings] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [currentUser, setCurrentUser] = useState(null);
  const [userTransaction, setUserTransaction] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (isOpen && bookId) {
      fetchBookDetails();
    }
  }, [isOpen, bookId]);

  // Add debugging logs to inspect data fetching and rendering
  const fetchBookDetails = async () => {
    setLoading(true);
    try {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUser(user);

      // Fetch book details
      const { data: bookData, error: bookError } = await supabase
        .from("books")
        .select("*")
        .eq("id", bookId)
        .single();

      if (bookError) throw bookError;

      setBook(bookData);

      // Check availability
      const { data: available, error: availError } = await supabase.rpc(
        "is_book_available",
        {
          book_uuid: bookId,
        }
      );
      setAvailability(availError ? true : available);

      // Check if user has this book issued
      if (user) {
        const { data: transactionData, error: transactionError } =
          await supabase
            .from("book_transactions")
            .select("*")
            .eq("user_id", user.id)
            .eq("book_id", bookId)
            .eq("action", "issue")
            .order("transaction_date", { ascending: false })
            .limit(1);

        if (
          !transactionError &&
          transactionData &&
          transactionData.length > 0
        ) {
          // Check if book has been returned
          const { data: returnData } = await supabase
            .from("book_transactions")
            .select("*")
            .eq("user_id", user.id)
            .eq("book_id", bookId)
            .eq("action", "return")
            .gte("transaction_date", transactionData[0].transaction_date);

          if (!returnData || returnData.length === 0) {
            setUserTransaction(transactionData[0]);
          }
        }
      }

      // Fetch ratings
      const { data: ratingsData, error: ratingsError } = await supabase
        .from("book_ratings")
        .select(
          `
          rating,
          comment,
          created_at,
          user_id
        `
        )
        .eq("book_id", bookId)
        .order("created_at", { ascending: false });

      if (!ratingsError && ratingsData) {
        setRatings(ratingsData);
        if (ratingsData.length > 0) {
          const avg =
            ratingsData.reduce((sum, r) => sum + r.rating, 0) /
            ratingsData.length;
          setAverageRating(Math.round(avg * 10) / 10);
        }
      }
    } catch (error) {
      console.error("Error fetching book details:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleIssueBook = async () => {
    if (!currentUser || !book) return;

    setActionLoading(true);
    try {
      const { error } = await supabase.rpc("issue_book", {
        user_uuid: currentUser.id,
        book_uuid: bookId,
      });

      if (error) throw error;

      toast.success("Book issued successfully!");
      setAvailability(false);
      setUserTransaction({
        user_id: currentUser.id,
        book_id: bookId,
        action: "issue",
        transaction_date: new Date().toISOString(),
        due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days from now
      });
    } catch (error) {
      console.error("Error issuing book:", error);
      toast.error(error.message || "Failed to issue book");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReturnBook = async () => {
    if (!currentUser || !book) return;

    setActionLoading(true);
    try {
      const { error } = await supabase.rpc("return_book", {
        user_uuid: currentUser.id,
        book_uuid: bookId,
      });

      if (error) throw error;

      toast.success("Book returned successfully!");
      setAvailability(true);
      setUserTransaction(null);
    } catch (error) {
      console.error("Error returning book:", error);
      toast.error(error.message || "Failed to return book");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRenewBook = async () => {
    if (!currentUser || !book) return;

    setActionLoading(true);
    try {
      const { error } = await supabase.rpc("renew_book", {
        user_uuid: currentUser.id,
        book_uuid: bookId,
      });

      if (error) throw error;

      toast.success("Book renewed successfully!");
      // Update the due date in userTransaction
      setUserTransaction((prev) => ({
        ...prev,
        due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // Extend by 14 days
      }));
    } catch (error) {
      console.error("Error renewing book:", error);
      toast.error(error.message || "Failed to renew book");
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (!isOpen) return null;

  return (
    <div
      data-lenis-prevent
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
    >
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : book ? (
          <>
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <BookOpen className="w-6 h-6" />
                Book Details
              </h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Book Cover */}
                <div className="lg:col-span-1">
                  <div className="aspect-w-3 aspect-h-4 bg-gray-200 rounded-lg overflow-hidden">
                    {book.cover_image_url ? (
                      <img
                        src={book.cover_image_url}
                        alt={book.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                        <BookOpen className="w-16 h-16 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Availability Status */}
                  <div className="mt-4 p-3 rounded-lg border">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          availability ? "bg-green-500" : "bg-red-500"
                        }`}
                      ></div>
                      <span
                        className={`font-medium ${
                          availability ? "text-green-700" : "text-red-700"
                        }`}
                      >
                        {availability ? "Available" : "Not Available"}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {book.count} {book.count === 1 ? "copy" : "copies"}{" "}
                      available
                    </p>
                  </div>
                </div>

                {/* Book Information */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Basic Info */}
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {book.title}
                    </h3>
                    <div className="flex items-center gap-2 text-gray-600 mb-4">
                      <User className="w-4 h-4" />
                      <span>by {book.author || "Unknown Author"}</span>
                    </div>
                  </div>

                  {/* Description */}
                  {book.description && (
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-3">
                        Description
                      </h4>
                      <div className="prose prose-sm max-w-none text-gray-700">
                        <ReactMarkdown>{book.description}</ReactMarkdown>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  {currentUser && role && !roleLoading && (
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-3">
                        Actions
                      </h4>
                      <div className="flex flex-col sm:flex-row gap-3">
                        {userTransaction ? (
                          <>
                            <button
                              onClick={handleReturnBook}
                              disabled={actionLoading}
                              className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                            >
                              <CheckCircle className="w-4 h-4" />
                              {actionLoading ? "Returning..." : "Return Book"}
                            </button>
                            <button
                              onClick={handleRenewBook}
                              disabled={actionLoading}
                              className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                            >
                              <RotateCcw className="w-4 h-4" />
                              {actionLoading ? "Renewing..." : "Renew Book"}
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={handleIssueBook}
                            disabled={actionLoading || !availability}
                            className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                          >
                            <BookOpen className="w-4 h-4" />
                            {actionLoading
                              ? "Issuing..."
                              : availability
                              ? "Issue Book"
                              : "Not Available"}
                          </button>
                        )}
                      </div>
                      {userTransaction && (
                        <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                          <div className="flex items-center gap-2 text-sm text-blue-700">
                            <Clock className="w-4 h-4" />
                            <span>
                              Due: {formatDate(userTransaction.due_date)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Ratings */}
                  {ratings.length > 0 && (
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-3">
                        Ratings & Reviews
                      </h4>
                      <div className="bg-gray-50 rounded-lg p-4 mb-4">
                        <div className="flex items-center mb-2">
                          <Star className="w-5 h-5 text-yellow-400 fill-current mr-2" />
                          <span className="text-xl font-bold text-gray-900">
                            {averageRating}
                          </span>
                          <span className="text-gray-600 ml-2">out of 10</span>
                          <span className="text-gray-500 ml-2">
                            ({ratings.length}{" "}
                            {ratings.length === 1 ? "rating" : "ratings"})
                          </span>
                        </div>
                      </div>

                      <div className="space-y-3 max-h-60 overflow-y-auto">
                        {ratings.map((rating, index) => (
                          <div
                            key={index}
                            className="bg-white border rounded-lg p-3"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center">
                                <Star className="w-4 h-4 text-yellow-400 fill-current mr-1" />
                                <span className="font-medium text-gray-900">
                                  {rating.rating}/10
                                </span>
                              </div>
                              <span className="text-xs text-gray-500">
                                {new Date(
                                  rating.created_at
                                ).toLocaleDateString()}
                              </span>
                            </div>
                            {rating.comment && (
                              <p className="text-sm text-gray-700">
                                {rating.comment}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Hash className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-600">Book ID:</span>
                        <span className="text-sm font-mono text-gray-900">
                          {book.id.slice(0, 8)}...
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-600">Added:</span>
                        <span className="text-sm text-gray-900">
                          {formatDate(book.created_at)}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Star className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-600">Copies:</span>
                        <span className="text-sm text-gray-900">
                          {book.count}
                        </span>
                      </div>

                      {book.updated_at &&
                        book.updated_at !== book.created_at && (
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-500" />
                            <span className="text-sm text-gray-600">
                              Updated:
                            </span>
                            <span className="text-sm text-gray-900">
                              {formatDate(book.updated_at)}
                            </span>
                          </div>
                        )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-600">Book not found</p>
          </div>
        )}
      </div>
    </div>
  );
}
