import { useState, useEffect } from "react";
import { supabase } from "../supabase/supabaseClient";
import useUserRole from "../supabase/useUserRole";
import { toast } from "react-toastify";
import ReactMarkdown from "react-markdown";
import BookDetailsModal from "../components/BookDetailsModal";
import RatingModal from "../components/RatingModal";

export default function Books() {
  const { role, loading: roleLoading } = useUserRole();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userTransactions, setUserTransactions] = useState([]);
  const [actionLoading, setActionLoading] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [selectedBookId, setSelectedBookId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [ratingBookId, setRatingBookId] = useState(null);
  const [ratingBookTitle, setRatingBookTitle] = useState("");
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);

  useEffect(() => {
    fetchBooks();
    if (!roleLoading) {
      fetchUserTransactions();
    }
  }, [roleLoading]);

  const fetchBooks = async () => {
    try {
      const { data, error } = await supabase
        .from("books")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // For each book, check if it's available and get ratings
      const booksWithAvailabilityAndRatings = await Promise.all(
        (data || []).map(async (book) => {
          try {
            // Check availability
            const { data: available, error: availError } = await supabase.rpc(
              "is_book_available",
              {
                book_uuid: book.id,
              }
            );

            // Get average rating and rating count
            const { data: ratings, error: ratingsError } = await supabase
              .from("book_ratings")
              .select("rating")
              .eq("book_id", book.id);

            let averageRating = 0;
            let ratingCount = 0;

            if (!ratingsError && ratings) {
              ratingCount = ratings.length;
              if (ratingCount > 0) {
                averageRating =
                  ratings.reduce((sum, r) => sum + r.rating, 0) / ratingCount;
              }
            }

            return {
              ...book,
              available: availError ? true : available, // fallback to true if error
              averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal place
              ratingCount,
            };
          } catch (err) {
            console.error("Error fetching data for book:", book.id, err);
            return {
              ...book,
              available: true, // fallback to true if error
              averageRating: 0,
              ratingCount: 0,
            };
          }
        })
      );

      setBooks(booksWithAvailabilityAndRatings);
    } catch (error) {
      console.error("Error fetching books:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserTransactions = async () => {
    if (!role) return;

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

    // Find the latest transaction
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

  const handleIssueBook = async (bookId) => {
    setActionLoading(bookId);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase.rpc("issue_book", {
        book_uuid: bookId,
        user_uuid: user.id,
      });

      if (error) throw error;

      if (data) {
        toast.success("Book issued successfully!");
        fetchBooks();
        fetchUserTransactions();
      } else {
        toast.warning("Book is not available");
      }
    } catch (error) {
      console.error("Error issuing book:", error);
      toast.error("Failed to issue book: " + error.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReturnBook = async (bookId) => {
    // Find the book title for the rating modal
    const book = books.find((b) => b.id === bookId);
    if (book) {
      setRatingBookId(bookId);
      setRatingBookTitle(book.title);
      setIsRatingModalOpen(true);
    }
  };

  const handleRatingSubmitted = async () => {
    if (!ratingBookId) return;

    setActionLoading(ratingBookId);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase.rpc("return_book", {
        book_uuid: ratingBookId,
        user_uuid: user.id,
      });

      if (error) throw error;

      if (data) {
        toast.success("Book returned successfully!");
        fetchBooks();
        fetchUserTransactions();
      } else {
        toast.error("Failed to return book");
      }
    } catch (error) {
      console.error("Error returning book:", error);
      toast.error("Failed to return book: " + error.message);
    } finally {
      setActionLoading(null);
      setRatingBookId(null);
      setRatingBookTitle("");
      setIsRatingModalOpen(false);
    }
  };

  const handleSkipRating = async () => {
    if (!ratingBookId) return;

    setActionLoading(ratingBookId);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase.rpc("return_book", {
        book_uuid: ratingBookId,
        user_uuid: user.id,
      });

      if (error) throw error;

      if (data) {
        toast.success("Book returned successfully!");
        fetchBooks();
        fetchUserTransactions();
      } else {
        toast.error("Failed to return book");
      }
    } catch (error) {
      console.error("Error returning book:", error);
      toast.error("Failed to return book: " + error.message);
    } finally {
      setActionLoading(null);
      setRatingBookId(null);
      setRatingBookTitle("");
      setIsRatingModalOpen(false);
    }
  };

  const handleRenewBook = async (bookId) => {
    setActionLoading(bookId);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase.rpc("renew_book", {
        book_uuid: bookId,
        user_uuid: user.id,
      });

      if (error) throw error;

      if (data) {
        toast.success("Book renewed successfully!");
        fetchUserTransactions();
      } else {
        toast.warning("Failed to renew book - it may not be issued to you");
      }
    } catch (error) {
      console.error("Error renewing book:", error);
      toast.error("Failed to renew book: " + error.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleEditBook = (bookId) => {
    window.location.href = `/books/edit/${bookId}`;
  };

  const handleDeleteBook = async (bookId) => {
    if (
      !confirm(
        "Are you sure you want to delete this book? This action cannot be undone."
      )
    ) {
      return;
    }

    setActionLoading(bookId);
    try {
      const { error } = await supabase.from("books").delete().eq("id", bookId);

      if (error) throw error;

      toast.success("Book deleted successfully!");
      fetchBooks();
    } catch (error) {
      console.error("Error deleting book:", error);
      toast.error("Failed to delete book: " + error.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleViewDetails = (bookId) => {
    setSelectedBookId(bookId);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedBookId(null);
  };

  // Filter books based on search query and rating
  const filteredBooks = books.filter((book) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      book.title?.toLowerCase().includes(query) ||
      book.author?.toLowerCase().includes(query) ||
      book.description?.toLowerCase().includes(query) ||
      book.genre?.toLowerCase().includes(query);

    const matchesRating = ratingFilter === "all" ||
      (ratingFilter === "unrated" && (!book.averageRating || book.averageRating === 0)) ||
      (ratingFilter !== "unrated" && book.averageRating >= parseFloat(ratingFilter));

    return matchesSearch && matchesRating;
  });

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading books...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Library Books</h1>
          {(role === "admin" || role === "librarian") && (
            <button
              onClick={() => (window.location.href = "/books/add")}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2 cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add New Book
            </button>
          )}
        </div>

        {/* Search and Filter Bar */}
        <div className="mb-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search Input */}
              <div className="flex-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg
                    className="h-5 w-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search books by title, author, or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer"
                  >
                    <svg
                      className="h-5 w-5 text-gray-400 hover:text-gray-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}
              </div>

              {/* Rating Filter */}
              <div className="sm:w-48">
                <select
                  value={ratingFilter}
                  onChange={(e) => setRatingFilter(e.target.value)}
                  className="block w-full py-3 px-3 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Ratings</option>
                  <option value="9.0">9.0+ Stars</option>
                  <option value="8.0">8.0+ Stars</option>
                  <option value="7.0">7.0+ Stars</option>
                  <option value="6.0">6.0+ Stars</option>
                  <option value="5.0">5.0+ Stars</option>
                  <option value="unrated">Unrated Only</option>
                </select>
              </div>
            </div>
          </div>

          {(searchQuery || ratingFilter !== "all") && (
            <div className="text-center mt-2">
              <span className="text-sm text-gray-600">
                Found {filteredBooks.length} book
                {filteredBooks.length !== 1 ? "s" : ""}
                {searchQuery && ` matching "${searchQuery}"`}
                {searchQuery && ratingFilter !== "all" && " and"}
                {ratingFilter !== "all" && ` ${ratingFilter === "unrated" ? "unrated" : ratingFilter + "+ rating"}`}
              </span>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredBooks.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <div className="text-6xl mb-4">📚</div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                {searchQuery ? "No books found" : "No books available"}
              </h2>
              <p className="text-gray-600">
                {searchQuery
                  ? `No books match your search for "${searchQuery}". Try different keywords.`
                  : "Books will appear here once they are added to the library."}
              </p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="mt-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer"
                >
                  Clear Search
                </button>
              )}
            </div>
          ) : (
            filteredBooks.map((book) => {
              const bookStatus = getBookStatus(book.id);
              const isAvailable = book.available;

              return (
                <div
                  key={book.id}
                  className="bg-white group relative rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow md:min-h-[70.5vh] duration-300"
                >
                  <div className="bg-gray-200">
                    {book.cover_image_url ? (
                      <img
                        src={book.cover_image_url}
                        alt={book.title}
                        className="w-full h-full md:absolute z-10 md:group-hover:scale-x-0 mx-auto transition duration-300"
                      />
                    ) : (
                      <div className="w-full h-54 bg-gray-300 flex items-center justify-center">
                        <span className="text-gray-500 text-sm">No Cover</span>
                      </div>
                    )}
                  </div>

                  <div className={`p-4 ${book.cover_image_url && "md:mt-5"}`}>
                    <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                      {book.title}
                    </h3>

                    {book.author && (
                      <p className="text-sm text-gray-600 mb-1">
                        by {book.author}
                      </p>
                    )}

                    {book.description && (
                      <div className="text-sm text-gray-700 mb-3 line-clamp-3 prose prose-sm max-w-none">
                        <ReactMarkdown>{book.description}</ReactMarkdown>
                      </div>
                    )}

                    <div className="flex items-center justify-between mb-3">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          isAvailable
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {isAvailable ? "Available" : "Issued"}
                      </span>
                      <span className="text-sm text-gray-600">
                        {book.count || 1} {book.count === 1 ? "copy" : "copies"}
                      </span>
                    </div>

                    {/* Rating Display */}
                    {book.ratingCount > 0 && (
                      <div className="flex items-center mb-3">
                        <div className="flex items-center">
                          <svg
                            className="w-4 h-4 text-yellow-400 fill-current"
                            viewBox="0 0 24 24"
                          >
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                          </svg>
                          <span className="text-sm font-medium text-gray-900 ml-1">
                            {book.averageRating}
                          </span>
                          <span className="text-sm text-gray-600 ml-1">
                            ({book.ratingCount}{" "}
                            {book.ratingCount === 1 ? "rating" : "ratings"})
                          </span>
                        </div>
                      </div>
                    )}

                    {bookStatus && (
                      <div className="mb-3 p-2 bg-blue-50 rounded text-sm">
                        <p className="text-blue-800">Issued to you</p>
                        {bookStatus.dueDate && (
                          <p className="text-blue-600">
                            Due:{" "}
                            {new Date(bookStatus.dueDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="flex space-x-2">
                      {bookStatus ? (
                        <>
                          <button
                            onClick={() => handleReturnBook(book.id)}
                            disabled={actionLoading === book.id}
                            className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 text-white text-sm font-semibold py-2.5 px-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {actionLoading === book.id
                              ? "Returning..."
                              : "Return"}
                          </button>
                          <button
                            onClick={() => handleRenewBook(book.id)}
                            disabled={actionLoading === book.id}
                            className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white text-sm font-semibold py-2.5 px-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            {actionLoading === book.id
                              ? "Renewing..."
                              : "Renew"}
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleIssueBook(book.id)}
                          disabled={actionLoading === book.id || !isAvailable}
                          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                          {actionLoading === book.id
                            ? "Issuing..."
                            : isAvailable
                            ? "Issue Book"
                            : "Unavailable"}
                        </button>
                      )}
                    </div>

                    {/* View Details Button */}
                    <button
                      onClick={() => handleViewDetails(book.id)}
                      className="w-full mt-3 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-semibold py-2.5 px-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      View Details
                    </button>

                    {/* Admin/Librarian Actions */}
                    {(role === "admin" || role === "librarian") && (
                      <div className="flex space-x-2 mt-3 pt-3 border-t border-gray-200">
                        <button
                          onClick={() => handleEditBook(book.id)}
                          className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-sm font-semibold py-2.5 px-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteBook(book.id)}
                          disabled={actionLoading === book.id}
                          className="flex-1 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 disabled:from-gray-400 disabled:to-gray-500 text-white text-sm font-semibold py-2.5 px-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          {actionLoading === book.id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Book Details Modal */}
      <BookDetailsModal
        bookId={selectedBookId}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />

      {/* Rating Modal */}
      <RatingModal
        bookId={ratingBookId}
        bookTitle={ratingBookTitle}
        isOpen={isRatingModalOpen}
        onClose={() => setIsRatingModalOpen(false)}
        onRatingSubmitted={handleRatingSubmitted}
      />
    </div>
  );
}
