import { useState } from "react";
import { supabase } from "../supabaseClient";
import { toast } from "react-toastify";
import { Star, X } from "lucide-react";

export default function RatingModal({
  bookId,
  bookTitle,
  isOpen,
  onClose,
  onRatingSubmitted,
}) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmitRating = async () => {
    if (rating === 0) {
      toast.warning("Please select a rating");
      return;
    }

    setSubmitting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Insert rating into ratings table
      const { error } = await supabase.from("book_ratings").insert([
        {
          book_id: bookId,
          user_id: user.id,
          rating: rating,
          comment: comment.trim() || null,
          created_at: new Date().toISOString(),
        },
      ]);

      if (error) throw error;

      toast.success("Thank you for rating this book!");
      onRatingSubmitted();
      onClose();
    } catch (error) {
      console.error("Error submitting rating:", error);
      toast.error("Failed to submit rating: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setRating(0);
    setHoverRating(0);
    setComment("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">Rate This Book</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="text-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {bookTitle}
            </h3>
            <p className="text-gray-600">How would you rate this book?</p>
          </div>

          {/* Star Rating */}
          <div className="flex justify-center mb-6">
            <div className="flex space-x-1">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="focus:outline-none"
                >
                  <Star
                    className={`w-8 h-8 ${
                      star <= (hoverRating || rating)
                        ? "text-yellow-400 fill-current"
                        : "text-gray-300"
                    } transition-colors`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Rating Display */}
          {rating > 0 && (
            <div className="text-center mb-4">
              <span className="text-2xl font-bold text-gray-900">
                {rating}/10
              </span>
            </div>
          )}

          {/* Comment */}
          <div className="mb-6">
            <label
              htmlFor="comment"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Comment (Optional)
            </label>
            <textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Share your thoughts about this book..."
            />
          </div>

          {/* Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={handleClose}
              className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition duration-300"
            >
              Skip
            </button>
            <button
              onClick={handleSubmitRating}
              disabled={submitting || rating === 0}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition duration-300 disabled:cursor-not-allowed"
            >
              {submitting ? "Submitting..." : "Submit Rating"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
