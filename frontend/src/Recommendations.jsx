import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import useUserRole from "./useUserRole";
import { toast } from "react-toastify";
import { generateBookRecommendations } from "./geminiUtils";
import { BookOpen, Star, Sparkles, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function Recommendations() {
  const { role, loading: roleLoading } = useUserRole();
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [user, setUser] = useState(null);

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
      // Fetch user's last 5 borrowed books
      const { data: transactions, error: transError } = await supabase
        .from("book_transactions")
        .select("book_id")
        .eq("user_id", userId)
        .eq("action", "issue")
        .order("transaction_date", { ascending: false })
        .limit(5);

      if (transError) throw transError;

      const bookIds = [...new Set(transactions?.map((t) => t.book_id) || [])];

      let userBorrowedBooks = [];
      if (bookIds.length > 0) {
        const { data: books, error: booksError } = await supabase
          .from("books")
          .select("id, title, author, description")
          .in("id", bookIds);

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

      // Fetch full book details for recommended books
      const recommendedTitles = aiRecommendations.map((rec) => rec.title);
      const { data: fullBooks, error: fullError } = await supabase
        .from("books")
        .select("*")
        .in("title", recommendedTitles);

      if (fullError) throw fullError;

      // Merge AI recommendations with full book data
      const recommendationsWithDetails = aiRecommendations
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

  const handleIssueBook = async (book) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Check if book is available
      const { data: available, error: availError } = await supabase.rpc(
        "is_book_available",
        {
          book_uuid: book.id,
        }
      );

      if (availError) throw availError;

      if (!available) {
        toast.error("Book is not available for issue");
        return;
      }

      // Issue the book
      const { error: issueError } = await supabase.rpc("issue_book", {
        book_uuid: book.id,
        user_uuid: user.id,
      });

      if (issueError) throw issueError;

      toast.success(`"${book.title}" issued successfully!`);
      // Optionally refresh recommendations or redirect to books page
    } catch (error) {
      console.error("Error issuing book:", error);
      toast.error("Failed to issue book: " + error.message);
    }
  };

  if (roleLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading recommendations...</p>
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
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-300"
            >
              Browse All Books
            </button>
          </div>

          {generating ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <Loader2 className="w-12 h-12 animate-spin text-purple-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Generating Recommendations
              </h2>
              <p className="text-gray-600">
                AI is analyzing your reading preferences...
              </p>
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
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition duration-300"
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
                      <p className="text-sm text-gray-700 bg-blue-50 p-2 rounded-md">
                        <strong>Why recommended:</strong>
                        <div className="mt-1 prose prose-sm max-w-none">
                          <ReactMarkdown>{book.reason}</ReactMarkdown>
                        </div>
                      </p>
                    </div>

                    <button
                      onClick={() => handleIssueBook(book)}
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-300"
                    >
                      Issue Book
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
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition duration-300 disabled:cursor-not-allowed"
            >
              {generating ? "Generating..." : "Refresh Recommendations"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
