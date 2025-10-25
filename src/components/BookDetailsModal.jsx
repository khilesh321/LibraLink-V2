import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabase/supabaseClient";
import useUserRole from "../supabase/useUserRole";
import { useBookmarks } from "../hooks/useBookmarks";
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
  QrCode,
  FileText,
  Heart,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "react-toastify";
import QRCodeGenerator from "./QRCodeGenerator";
import BookSummaryModal from "./BookSummaryModal";

export default function BookDetailsModal({ bookId, isOpen, onClose, onBookAction }) {
  const { role, loading: roleLoading } = useUserRole();
  const { toggleBookmark, isBookmarked } = useBookmarks();
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(false);
  const [availability, setAvailability] = useState(null);
  const [ratings, setRatings] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [currentUser, setCurrentUser] = useState(null);
  const [userTransaction, setUserTransaction] = useState(null);
  const [actionLoading, setActionLoading] = useState({}); // { actionType: boolean }
  const [showQRCode, setShowQRCode] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [renewalCount, setRenewalCount] = useState(0);

  useEffect(() => {
    if (isOpen && bookId) {
      fetchBookDetails();
    }
  }, [isOpen, bookId]);

  // Add debugging logs to inspect data fetching and rendering
  const fetchBookDetails = useCallback(async () => {
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
            .order("transaction_date", { ascending: false })
            .limit(1);

        if (
          !transactionError &&
          transactionData &&
          transactionData.length > 0 &&
          (transactionData[0].action === "issue" || transactionData[0].action === "renew")
        ) {
          setUserTransaction(transactionData[0]);
        } else {
          setUserTransaction(null);
        }

        // Count renewals for this book
        const { data: allTransactions, error: allError } = await supabase
          .from("book_transactions")
          .select("*")
          .eq("user_id", user.id)
          .eq("book_id", bookId)
          .order("transaction_date", { ascending: true });

        if (!allError && allTransactions) {
          let renewCount = 0;
          let hasActiveIssue = false;
          
          for (const transaction of allTransactions) {
            if (transaction.action === "issue") {
              hasActiveIssue = true;
              renewCount = 0; // Reset renewal count on new issue
            } else if (transaction.action === "renew" && hasActiveIssue) {
              renewCount++;
            } else if (transaction.action === "return") {
              hasActiveIssue = false;
            }
          }
          
          setRenewalCount(renewCount);
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
    } catch {
      // Error handled silently - component will show appropriate state
    } finally {
      setLoading(false);
    }
  }, [bookId]);

  const handleIssueBook = async () => {
    if (!currentUser || !book) return;

    setActionLoading(prev => ({ ...prev, issue: true }));
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
      setRenewalCount(0); // Reset renewal count when book is issued
      // Notify parent component to refresh data
      if (onBookAction) onBookAction();
    } catch (error) {
      toast.error(error.message || "Failed to issue book");
    } finally {
      setActionLoading(prev => {
        const newState = { ...prev };
        delete newState.issue;
        return newState;
      });
    }
  };

  const handleReturnBook = async () => {
    if (!currentUser || !book) return;

    setActionLoading(prev => ({ ...prev, return: true }));
    try {
      const { error } = await supabase.rpc("return_book", {
        user_uuid: currentUser.id,
        book_uuid: bookId,
      });

      if (error) throw error;

      toast.success("Book returned successfully!");
      setAvailability(true);
      setUserTransaction(null);
      setRenewalCount(0); // Reset renewal count when book is returned
      // Notify parent component to refresh data
      if (onBookAction) onBookAction();
    } catch (error) {
      toast.error(error.message || "Failed to return book");
    } finally {
      setActionLoading(prev => {
        const newState = { ...prev };
        delete newState.return;
        return newState;
      });
    }
  };

  const handleRenewBook = async () => {
    if (!currentUser || !book) return;

    // Check if user has already renewed twice
    if (renewalCount >= 2) {
      toast.error("You can only renew this book twice. Please return it instead.");
      return;
    }

    setActionLoading(prev => ({ ...prev, renew: true }));
    try {
      const { error } = await supabase.rpc("renew_book", {
        user_uuid: currentUser.id,
        book_uuid: bookId,
      });

      if (error) throw error;

      toast.success("Book renewed successfully!");
      // Increment renewal count
      setRenewalCount(prev => prev + 1);
      // Re-fetch book details to get updated transaction data from server
      fetchBookDetails();
      // Notify parent component to refresh data
      if (onBookAction) onBookAction();
    } catch (error) {
      toast.error(error.message || "Failed to renew book");
    } finally {
      setActionLoading(prev => {
        const newState = { ...prev };
        delete newState.renew;
        return newState;
      });
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
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-2 sm:p-4"
    >
      <div className="bg-white rounded-lg max-w-5xl w-full max-h-[95vh] overflow-hidden">
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
                className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-6 overflow-y-auto overflow-x-hidden max-h-[calc(95vh-140px)]">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                {/* Book Cover */}
                <div className="lg:col-span-1">
                  <div className="aspect-w-3 aspect-h-4 bg-gray-200 rounded-lg overflow-hidden max-w-full">
                    {book.cover_image_url ? (
                      <img
                        src={book.cover_image_url}
                        alt={book.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-linear-to-br from-blue-100 to-purple-100 flex items-center justify-center">
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
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {userTransaction ? (
                          <>
                            <button
                              onClick={handleReturnBook}
                              disabled={actionLoading.return}
                              className="w-full bg-linear-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 cursor-pointer"
                            >
                              <CheckCircle className="w-4 h-4" />
                              {actionLoading.return ? "Returning..." : "Return Book"}
                            </button>
                            <button
                              onClick={handleRenewBook}
                              disabled={actionLoading.renew || renewalCount >= 2}
                              className="w-full bg-linear-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 cursor-pointer"
                            >
                              <RotateCcw className="w-4 h-4" />
                              {actionLoading.renew 
                                ? "Renewing..." 
                                : renewalCount >= 2 
                                  ? "Max Renewals Reached" 
                                  : "Renew Book"}
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={handleIssueBook}
                            disabled={actionLoading.issue || !availability}
                            className="w-full bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <BookOpen className="w-4 h-4" />
                            {actionLoading.issue
                              ? "Issuing..."
                              : availability
                              ? "Issue Book"
                              : "Not Available"}
                          </button>
                        )}
                        <button
                          onClick={() => setShowQRCode(!showQRCode)}
                          className="w-full bg-linear-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <QrCode className="w-4 h-4" />
                          {showQRCode ? "Hide QR Code" : "Generate QR Code"}
                        </button>
                        <button
                          onClick={() => setShowSummary(true)}
                          className="w-full bg-linear-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <FileText className="w-4 h-4" />
                          Summarize Book
                        </button>
                        <button
                          onClick={() => toggleBookmark(bookId)}
                          className={`w-full font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
                            isBookmarked(bookId)
                              ? "bg-linear-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white"
                              : "bg-linear-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white"
                          }`}
                        >
                          <Heart className={`w-4 h-4 ${isBookmarked(bookId) ? "fill-current" : ""}`} />
                          {isBookmarked(bookId) ? "Remove from Wishlist" : "Add to Wishlist"}
                        </button>
                      </div>
                      {userTransaction && (
                        <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                          <div className="flex items-center gap-2 text-sm text-blue-700 mb-1">
                            <Clock className="w-4 h-4" />
                            <span>
                              Due: {formatDate(userTransaction.due_date)}
                            </span>
                          </div>
                          <div className="text-sm text-blue-600">
                            Renewals used: {renewalCount}/2
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* QR Code Section */}
                  {showQRCode && (
                    <div className="mt-6">
                      <h4 className="text-lg font-semibold text-gray-900 mb-3">
                        Share Book QR Code
                      </h4>
                      <div className="bg-linear-to-br from-purple-50 to-pink-50 rounded-lg p-4">
                        <QRCodeGenerator
                          bookUrl={`${window.location.origin}/book/${bookId}`}
                          bookTitle={book.title}
                        />
                      </div>
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

      {/* Book Summary Modal */}
      <BookSummaryModal
        book={book}
        isOpen={showSummary}
        onClose={() => setShowSummary(false)}
      />
    </div>
  );
}
