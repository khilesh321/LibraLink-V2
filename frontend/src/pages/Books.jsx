import { useState, useEffect } from "react";
import { supabase } from "../supabase/supabaseClient";
import useUserRole from "../supabase/useUserRole";
import { useBookmarks } from "../hooks/useBookmarks";
import { toast } from "react-toastify";
import ReactMarkdown from "react-markdown";
import BookDetailsModal from "../components/BookDetailsModal";
import RatingModal from "../components/RatingModal";
import { Heart } from "lucide-react";

export default function Books() {
  const { role, loading: roleLoading } = useUserRole();
  const { bookmarks, toggleBookmark, checkMultipleBookmarks, isBookmarked } = useBookmarks();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userTransactions, setUserTransactions] = useState([]);
  const [actionLoading, setActionLoading] = useState({}); // { bookId: actionType }
  const [searchQuery, setSearchQuery] = useState("");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [selectedBookId, setSelectedBookId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [ratingBookId, setRatingBookId] = useState(null);
  const [ratingBookTitle, setRatingBookTitle] = useState("");
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
  const [deleteBookId, setDeleteBookId] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentUser, setCurrentUser] = useState(null);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchBooks();
    if (!roleLoading) {
      fetchUserTransactions();
    }
    getCurrentUser();
  }, [roleLoading]);

  const getCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    } catch (error) {
      console.error('Error getting current user:', error);
    }
  };

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

      // Check bookmark status for all books
      const bookIds = booksWithAvailabilityAndRatings.map(book => book.id);
      checkMultipleBookmarks(bookIds);
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
    setActionLoading(prev => ({ ...prev, [bookId]: 'issue' }));
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
      setActionLoading(prev => {
        const newState = { ...prev };
        delete newState[bookId];
        return newState;
      });
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

    setActionLoading(prev => ({ ...prev, [ratingBookId]: 'return' }));
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
      setActionLoading(prev => {
        const newState = { ...prev };
        delete newState[ratingBookId];
        return newState;
      });
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
    setActionLoading(prev => ({ ...prev, [bookId]: 'renew' }));
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
      setActionLoading(prev => {
        const newState = { ...prev };
        delete newState[bookId];
        return newState;
      });
    }
  };

  const handleEditBook = (bookId) => {
    window.location.href = `/books/edit/${bookId}`;
  };

  const handleDeleteBook = (bookId) => {
    setDeleteBookId(bookId);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteBook = async () => {
    if (!deleteBookId) return;

    setIsDeleteModalOpen(false);
    setActionLoading(prev => ({ ...prev, [deleteBookId]: 'delete' }));
    try {
      const { error } = await supabase.from("books").delete().eq("id", deleteBookId);

      if (error) throw error;

      toast.success("Book deleted successfully!");
      fetchBooks();
    } catch (error) {
      console.error("Error deleting book:", error);
      toast.error("Failed to delete book: " + error.message);
    } finally {
      setActionLoading(prev => {
        const newState = { ...prev };
        delete newState[deleteBookId];
        return newState;
      });
      setDeleteBookId(null);
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

  // Pagination logic
  const totalPages = Math.ceil(filteredBooks.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedBooks = filteredBooks.slice(startIndex, endIndex);

  // Reset to first page when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, ratingFilter]);

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
          {paginatedBooks.length === 0 ? (
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
            paginatedBooks.map((book) => {
              const bookStatus = getBookStatus(book.id);

              return (
                <div
                  key={book.id}
                  className="bg-white group relative rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow md:min-h-[70.5vh] duration-300"
                >
                  <div className="bg-gray-200 h-64 md:h-auto relative">
                    {/* Bookmark Button - Only show when user is logged in */}
                    {currentUser && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleBookmark(book.id);
                        }}
                        className="absolute top-3 right-3 z-20 p-2 rounded-full bg-white/90 hover:bg-white shadow-md hover:shadow-lg transition-all duration-200"
                        title={isBookmarked(book.id) ? "Remove from wishlist" : "Add to wishlist"}
                      >
                        <Heart
                          className={`w-5 h-5 transition-colors duration-200 ${
                            isBookmarked(book.id)
                              ? "fill-red-500 text-red-500"
                              : "text-gray-600 hover:text-red-500"
                          }`}
                        />
                      </button>
                    )}

                    {book.cover_image_url ? (
                      <img
                        src={book.cover_image_url}
                        alt={book.title}
                        className="w-full h-full max-sm:object-cover md:absolute z-10 md:group-hover:scale-x-0 mx-auto transition duration-300"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-300 flex items-center justify-center">
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

                    <div className="text-right mb-3">
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

                    {/* View Details Button */}
                    <button
                      onClick={() => handleViewDetails(book.id)}
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                          disabled={actionLoading[book.id] === 'delete'}
                          className="flex-1 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 disabled:from-gray-400 disabled:to-gray-500 text-white text-sm font-semibold py-2.5 px-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          {actionLoading[book.id] === 'delete' ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center mt-8 space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Previous
            </button>

            <div className="flex space-x-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-2 text-sm font-medium rounded-lg transition duration-200 ${
                    currentPage === page
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>

            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200 flex items-center gap-2"
            >
              Next
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}

        {/* Page Info */}
        {filteredBooks.length > itemsPerPage && (
          <div className="text-center mt-4 text-sm text-gray-600">
            Showing {startIndex + 1}-{Math.min(endIndex, filteredBooks.length)} of {filteredBooks.length} books
            {searchQuery && ` matching "${searchQuery}"`}
            {searchQuery && ratingFilter !== "all" && " and"}
            {ratingFilter !== "all" && ` ${ratingFilter === "unrated" ? "unrated" : ratingFilter + "+ rating"}`}
          </div>
        )}
      </div>

      {/* Book Details Modal */}
      <BookDetailsModal
        bookId={selectedBookId}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onBookAction={fetchBooks} // Pass callback to refresh book data
      />

      {/* Rating Modal */}
      <RatingModal
        bookId={ratingBookId}
        bookTitle={ratingBookTitle}
        isOpen={isRatingModalOpen}
        onClose={() => setIsRatingModalOpen(false)}
        onRatingSubmitted={handleRatingSubmitted}
      />

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900">Delete Book</h3>
                  <p className="text-sm text-gray-600 mt-1">This action cannot be undone.</p>
                </div>
              </div>
              <p className="text-gray-700 mb-6">
                Are you sure you want to delete this book? This will permanently remove the book and all its data from the system.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setDeleteBookId(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteBook}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition duration-200"
                >
                  Delete Book
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
