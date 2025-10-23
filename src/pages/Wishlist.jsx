import { useState, useEffect } from "react";
import { supabase } from "../supabase/supabaseClient";
import { getUserBookmarks } from "../supabase/bookmarks";
import { useBookmarks } from "../hooks/useBookmarks";
import { toast } from "react-toastify";
import ReactMarkdown from "react-markdown";
import { Heart, BookOpen, Calendar, User, Star, Trash2 } from "lucide-react";

export default function Wishlist() {
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userTransactions, setUserTransactions] = useState([]);
  const { toggleBookmark, loading: bookmarkLoading } = useBookmarks();

  useEffect(() => {
    fetchBookmarks();
    fetchUserTransactions();
  }, []);

  const fetchBookmarks = async () => {
    try {
      const bookmarkData = await getUserBookmarks();
      setBookmarks(bookmarkData);
    } catch (error) {
      console.error("Error fetching bookmarks:", error);
      toast.error("Failed to load your wishlist");
    } finally {
      setLoading(false);
    }
  };

  const fetchUserTransactions = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("book_transactions")
        .select("book_id, action, due_date, transaction_date")
        .eq("user_id", user.id)
        .order("transaction_date", { ascending: false });

      if (error) throw error;
      setUserTransactions(data || []);
    } catch (error) {
      console.error("Error fetching user transactions:", error);
    }
  };

  const getBookStatus = (bookId) => {
    const transactions = userTransactions.filter((t) => t.book_id === bookId);
    if (transactions.length === 0) return null;

    const latestTransaction = transactions[0];
    const hasReturn = transactions.some(
      (t) =>
        t.action === "return" &&
        t.transaction_date > latestTransaction.transaction_date
    );

    if (
      !hasReturn &&
      (latestTransaction.action === "issue" ||
        latestTransaction.action === "renew")
    ) {
      return {
        status: "issued",
        dueDate: latestTransaction.due_date,
      };
    }

    return null;
  };

  const handleRemoveBookmark = async (bookId, bookTitle) => {
    await toggleBookmark(bookId, bookTitle);
    // Refresh the bookmarks list
    fetchBookmarks();
  };

  const handleIssueBook = async (bookId) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error } = await supabase.from("book_transactions").insert({
        user_id: user.id,
        book_id: bookId,
        action: "issue",
        transaction_date: new Date().toISOString(),
        due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days from now
      });

      if (error) throw error;

      toast.success("Book issued successfully!");
      fetchUserTransactions(); // Refresh transactions
    } catch (error) {
      console.error("Error issuing book:", error);
      toast.error("Failed to issue book. Please try again.");
    }
  };

  const handleReturnBook = async (bookId) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error } = await supabase.from("book_transactions").insert({
        user_id: user.id,
        book_id: bookId,
        action: "return",
        transaction_date: new Date().toISOString(),
      });

      if (error) throw error;

      toast.success("Book returned successfully!");
      fetchUserTransactions(); // Refresh transactions
    } catch (error) {
      console.error("Error returning book:", error);
      toast.error("Failed to return book. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading your wishlist...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Heart className="w-8 h-8 text-red-500" />
            <h1 className="text-3xl font-bold text-gray-900">My Wishlist</h1>
          </div>
          <p className="text-gray-600">
            Books you've saved to read later. Keep track of your reading goals!
          </p>
        </div>

        {/* Bookmarks Grid */}
        {bookmarks.length === 0 ? (
          <div className="text-center py-12">
            <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Your wishlist is empty
            </h2>
            <p className="text-gray-600 mb-6">
              Start building your reading list by adding books you want to read later.
            </p>
            <a
              href="/books"
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              <BookOpen className="w-5 h-5" />
              Browse Books
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {bookmarks.map((book) => {
              const bookStatus = getBookStatus(book.id);

              return (
                <div
                  key={book.id}
                  className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                >
                  {/* Book Cover */}
                  <div className="h-64 bg-gray-200 relative">
                    {book.cover_image_url ? (
                      <img
                        src={book.cover_image_url}
                        alt={book.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-300 flex items-center justify-center">
                        <span className="text-gray-500 text-sm">No Cover</span>
                      </div>
                    )}

                    {/* Bookmark Button */}
                    <button
                      onClick={() => handleRemoveBookmark(book.id, book.title)}
                      disabled={bookmarkLoading}
                      className="absolute top-3 right-3 p-2 bg-white/90 hover:bg-white rounded-full shadow-md transition-colors disabled:opacity-50"
                    >
                      <Heart className="w-5 h-5 text-red-500 fill-current" />
                    </button>
                  </div>

                  {/* Book Details */}
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                      {book.title}
                    </h3>

                    {book.author && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                        <User className="w-4 h-4" />
                        <span>by {book.author}</span>
                      </div>
                    )}

                    {book.description && (
                      <div className="text-sm text-gray-700 mb-3 line-clamp-3 prose prose-sm max-w-none">
                        <ReactMarkdown>{book.description}</ReactMarkdown>
                      </div>
                    )}

                    {/* Rating Display */}
                    {book.ratingCount > 0 && (
                      <div className="flex items-center gap-2 mb-3">
                        <Star className="w-4 h-4 text-yellow-500 fill-current" />
                        <span className="text-sm text-gray-600">
                          {book.averageRating} ({book.ratingCount} reviews)
                        </span>
                      </div>
                    )}

                    {/* Book Status */}
                    <div className="text-sm text-gray-600 mb-3">
                      <span className="font-medium">
                        {book.count || 1} {book.count === 1 ? "copy" : "copies"} available
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      {bookStatus?.status === "issued" ? (
                        <button
                          onClick={() => handleReturnBook(book.id)}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                          Return Book
                        </button>
                      ) : (
                        <button
                          onClick={() => handleIssueBook(book.id)}
                          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                          Issue Book
                        </button>
                      )}

                      <button
                        onClick={() => handleRemoveBookmark(book.id, book.title)}
                        disabled={bookmarkLoading}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Remove from wishlist"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Due Date */}
                    {bookStatus?.status === "issued" && bookStatus.dueDate && (
                      <div className="mt-3 flex items-center gap-2 text-sm text-orange-600">
                        <Calendar className="w-4 h-4" />
                        <span>Due: {new Date(bookStatus.dueDate).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}