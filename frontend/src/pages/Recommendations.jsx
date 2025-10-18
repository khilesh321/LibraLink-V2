import { useState, useEffect } from "react";
import { supabase } from "../supabase/supabaseClient";
import useUserRole from "../supabase/useUserRole";
import { toast } from "react-toastify";
import { generateBookRecommendations } from "../utils/geminiUtils";
import { BookOpen, Star, Sparkles, Eye, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import BookDetailsModal from "../components/BookDetailsModal";

export default function Recommendations() {
  const { role, loading: roleLoading } = useUserRole();
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [user, setUser] = useState(null);
  const [selectedBookId, setSelectedBookId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (!roleLoading) {
      if (!role) {
        window.location.href = "/login";
        return;
      }
      fetchUserAndGenerateRecommendations();
    }
  }, [roleLoading, role]);

  const fetchUserAndGenerateRecommendations = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      setUser(user);
      await generateRecommendations(user.id);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to load recommendations");
    } finally {
      setLoading(false);
    }
  };

  const generateRecommendations = async (userId) => {
    setGenerating(true);
    try {
      // Fetch ALL user's borrowed books (not just last 5) for comprehensive filtering
      const { data: allTransactions, error: allTransError } = await supabase
        .from("book_transactions")
        .select("book_id, transaction_date")
        .eq("user_id", userId)
        .eq("action", "issue")
        .order("transaction_date", { ascending: false });

      if (allTransError) throw allTransError;

      const allBookIds = [...new Set(allTransactions?.map((t) => t.book_id) || [])];

      let userBorrowedBooks = [];
      if (allBookIds.length > 0) {
        const { data: books, error: booksError } = await supabase
          .from("books")
          .select("id, title, author, description")
          .in("id", allBookIds);

        if (booksError) throw booksError;
        userBorrowedBooks = books || [];
      }

      // Fetch top 50 books (by creation date or some metric)
      const { data: topBooks, error: topError } = await supabase
        .from("books")
        .select("id, title, author, description")
        .order("created_at", { ascending: false })
        .limit(50);

      if (topError) throw topError;

      // Fetch ratings for top books
      const topBookIds = topBooks.map((b) => b.id);
      const { data: ratingsData, error: ratingsError } = await supabase
        .from("book_ratings")
        .select("book_id, rating")
        .in("book_id", topBookIds);
      if (ratingsError) throw ratingsError;

      // Calculate average rating for each top book
      const ratingsMap = {};
      ratingsData.forEach((r) => {
        if (!ratingsMap[r.book_id]) ratingsMap[r.book_id] = [];
        ratingsMap[r.book_id].push(r.rating);
      });
      const topBooksWithRatings = topBooks.map((book) => {
        const ratings = ratingsMap[book.id] || [];
        const averageRating =
          ratings.length > 0
            ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
            : 0;
        return { ...book, averageRating };
      });

      // Sort top books by average rating (descending)
      topBooksWithRatings.sort((a, b) => b.averageRating - a.averageRating);

      // Pass ratings to AI recommendations
      const aiRecommendations = await generateBookRecommendations(
        userBorrowedBooks,
        topBooksWithRatings || []
      );

      // Debug logging
      console.log("User borrowed books:", userBorrowedBooks.map(b => ({ title: b.title, author: b.author, id: b.id })));
      console.log("AI recommendations before filtering:", aiRecommendations.map(r => ({ title: r.title, author: r.author })));

      // COMPREHENSIVE FILTERING: Remove books user has already borrowed
      const userBorrowedTitles = userBorrowedBooks.map(book => book.title.toLowerCase().trim());
      const userBorrowedAuthors = userBorrowedBooks.map(book => book.author?.toLowerCase().trim()).filter(Boolean);

      const filteredRecommendations = aiRecommendations.filter(rec => {
        const recTitle = rec.title.toLowerCase().trim();
        const recAuthor = rec.author?.toLowerCase().trim();

        // Check exact title match
        const titleMatch = userBorrowedTitles.includes(recTitle);

        // Check author match (if both have authors)
        const authorMatch = recAuthor && userBorrowedAuthors.includes(recAuthor);

        // Check for partial title matches (in case of slight variations)
        const partialTitleMatch = userBorrowedTitles.some(borrowedTitle =>
          borrowedTitle.includes(recTitle) || recTitle.includes(borrowedTitle)
        );

        const isBorrowed = titleMatch || authorMatch || partialTitleMatch;

        if (isBorrowed) {
          console.log("Filtering out already borrowed book:", {
            recommended: { title: rec.title, author: rec.author },
            reason: titleMatch ? "title match" : authorMatch ? "author match" : "partial title match"
          });
        }
        return !isBorrowed;
      });

      console.log("AI recommendations after filtering:", filteredRecommendations.map(r => r.title));

      // If we filtered out too many recommendations, get additional ones from top books
      let finalRecommendations = filteredRecommendations;
      if (filteredRecommendations.length < 3 && topBooksWithRatings.length > aiRecommendations.length) {
        // Get additional recommendations from highly-rated books not already recommended
        const recommendedTitles = new Set(filteredRecommendations.map(rec => rec.title.toLowerCase().trim()));
        
        // Filter out test/demo books from additional recommendations
        const testKeywords = ['test', 'demo', 'sample', 'example', 'dummy', 'temp', 'temporary', 'placeholder'];
        
        const additionalBooks = topBooksWithRatings
          .filter(book => !recommendedTitles.has(book.title.toLowerCase().trim()) &&
                         !userBorrowedTitles.includes(book.title.toLowerCase().trim()) &&
                         !userBorrowedAuthors.includes(book.author?.toLowerCase().trim()) &&
                         !testKeywords.some(keyword => book.title.toLowerCase().trim().includes(keyword)))
          .slice(0, 5 - filteredRecommendations.length)
          .map(book => ({
            title: book.title,
            author: book.author || "Unknown",
            reason: `Highly-rated book (${book.averageRating.toFixed(1)}/5 stars) that complements your reading interests.`,
            relevanceScore: Math.min(7, Math.max(5, book.averageRating * 1.4))
          }));

        finalRecommendations = [...filteredRecommendations, ...additionalBooks];
        console.log("Added additional recommendations:", additionalBooks.map(r => r.title));
      }

      // FINAL CHECK: Ensure no borrowed books made it through all filters
      const finalFilteredRecommendations = finalRecommendations.filter(rec => {
        const recTitle = rec.title.toLowerCase().trim();
        const recAuthor = rec.author?.toLowerCase().trim();

        const titleMatch = userBorrowedTitles.includes(recTitle);
        const authorMatch = recAuthor && userBorrowedAuthors.includes(recAuthor);

        // Also filter out test/demo books
        const testKeywords = ['test', 'demo', 'sample', 'example', 'dummy', 'temp', 'temporary', 'placeholder'];
        const isTestBook = testKeywords.some(keyword => recTitle.includes(keyword));

        if (titleMatch || authorMatch) {
          console.log("FINAL CHECK: Removing borrowed book from final recommendations:", rec.title);
          return false;
        }
        if (isTestBook) {
          console.log("FINAL CHECK: Removing test/demo book from final recommendations:", rec.title);
          return false;
        }
        return true;
      });

      console.log("Final recommendations after all filtering:", finalFilteredRecommendations.map(r => r.title));

      // Fetch full book details for recommended books
      const recommendedTitles = finalFilteredRecommendations.map((rec) => rec.title);
      const { data: fullBooks, error: fullError } = await supabase
        .from("books")
        .select("*")
        .in("title", recommendedTitles);

      if (fullError) throw fullError;

      // Merge AI recommendations with full book data
      const recommendationsWithDetails = finalFilteredRecommendations
        .map((rec) => {
          const bookDetails = fullBooks?.find(
            (book) => book.title === rec.title
          );
          return {
            ...rec,
            ...bookDetails,
          };
        })
        .filter((rec) => rec.id); // Only include books that exist in our database

      setRecommendations(recommendationsWithDetails);
      toast.success("Recommendations generated successfully!");
    } catch (error) {
      console.error("Error generating recommendations:", error);
      toast.error("Failed to generate recommendations. Please try again.");
    } finally {
      setGenerating(false);
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

  if (roleLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center max-w-md mx-4">
          <div className="relative mb-6">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-200 border-t-purple-600 mx-auto"></div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            🤖 AI is Thinking...
          </h2>
          <p className="text-gray-600 text-lg">
            Analyzing your reading preferences and crafting personalized recommendations
          </p>
          <div className="mt-4 flex justify-center space-x-1">
            <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
            <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <Sparkles className="w-8 h-8 text-purple-600" />
                AI Book Recommendations
              </h1>
              <p className="text-gray-600 mt-2">
                Personalized book suggestions based on your reading history
              </p>
            </div>
            <button
              onClick={() => (window.location.href = "/books")}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-300 cursor-pointer"
            >
              Browse All Books
            </button>
          </div>

          {generating ? (
            <div className="bg-white rounded-xl shadow-lg p-8 text-center max-w-lg mx-auto">
              <div className="relative mb-6">
                <Loader2 className="w-16 h-16 animate-spin text-purple-600 mx-auto" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                🚀 AI is Generating Magic...
              </h2>
              <p className="text-gray-600 text-lg mb-4">
                Our AI is crafting personalized book recommendations just for you
              </p>
              <div className="flex justify-center items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-3 h-3 bg-purple-600 rounded-full animate-pulse"></div>
                  <div className="w-3 h-3 bg-blue-600 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                  <div className="w-3 h-3 bg-indigo-600 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                </div>
                <span className="text-sm text-gray-500 ml-2">Analyzing your taste...</span>
              </div>
            </div>
          ) : recommendations.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                No Recommendations Yet
              </h2>
              <p className="text-gray-600 mb-4">
                You need to borrow some books first to get personalized
                recommendations.
              </p>
              <button
                onClick={() => (window.location.href = "/books")}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition duration-300 cursor-pointer"
              >
                Start Borrowing Books
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recommendations.map((book, index) => (
                <div
                  key={book.id || index}
                  className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300"
                >
                  <div className="aspect-w-3 aspect-h-4 bg-gray-200 relative">
                    {book.cover_image_url ? (
                      <img
                        src={book.cover_image_url}
                        alt={book.title}
                        className="w-full h-48 object-cover"
                      />
                    ) : (
                      <div className="w-full h-48 bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                        <BookOpen className="w-12 h-12 text-gray-400" />
                      </div>
                    )}
                    <div className="absolute top-2 right-2 bg-purple-600 text-white px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                      <Star className="w-3 h-3" />
                      {book.relevanceScore}/10
                    </div>
                  </div>

                  <div className="p-4">
                    <h3 className="font-semibold text-lg text-gray-900 mb-1 line-clamp-2">
                      {book.title}
                    </h3>
                    <p className="text-gray-600 text-sm mb-2">
                      by {book.author || "Unknown Author"}
                    </p>

                    <div className="mb-3">
                      <div className="text-sm text-gray-700 bg-blue-50 p-2 rounded-md">
                        <strong>Why recommended:</strong>
                        <div className="mt-1 prose prose-sm max-w-none">
                          <ReactMarkdown>{book.reason}</ReactMarkdown>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleViewDetails(book.id)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-300 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Eye className="w-4 h-4" />
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-8 text-center">
            <button
              onClick={() => generateRecommendations(user?.id)}
              disabled={generating}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition duration-300 disabled:cursor-not-allowed cursor-pointer"
            >
              {generating ? "Generating..." : "Refresh Recommendations"}
            </button>
          </div>
        </div>
      </div>

      {/* Book Details Modal */}
      <BookDetailsModal
        bookId={selectedBookId}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  );
}
