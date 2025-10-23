import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../supabase/supabaseClient";
import useUserRole from "../supabase/useUserRole";
import { toast } from "react-toastify";
import BookCoverGenerator from "./BookCoverGenerator";
import { generateBookDescription } from "../utils/geminiUtils";
import { Wand2 } from "lucide-react";

export default function EditBook() {
  const { role, loading: roleLoading } = useUserRole();
  const { id } = useParams();
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [description, setDescription] = useState("");
  const [count, setCount] = useState(1);
  const [coverImage, setCoverImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [existingCoverUrl, setExistingCoverUrl] = useState(null);
  const [showCoverGenerator, setShowCoverGenerator] = useState(false);
  const [generatingDescription, setGeneratingDescription] = useState(false);
  const [applyingCover, setApplyingCover] = useState(false);

  // Check if user has permission
  if (!roleLoading && (!role || (role !== "admin" && role !== "librarian"))) {
    return (
      <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Access Denied
          </h1>
          <p className="text-gray-600">
            You don't have permission to edit books.
          </p>
          <button
            onClick={() => (window.location.href = "/books")}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-300 cursor-pointer"
          >
            Back to Books
          </button>
        </div>
      </div>
    );
  }

  useEffect(() => {
    fetchBook();
  }, [id]);

  const fetchBook = async () => {
    try {
      const { data, error } = await supabase
        .from("books")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      if (data) {
        setTitle(data.title || "");
        setAuthor(data.author || "");
        setDescription(data.description || "");
        setCount(data.count || 1);
        setExistingCoverUrl(data.cover_image_url);
        setPreviewUrl(data.cover_image_url);
      }
    } catch (error) {
      console.error("Error fetching book:", error);
      toast.error("Failed to load book data: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCoverImage(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const uploadImage = async (file) => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `book-covers/${fileName}`;

    const { data, error } = await supabase.storage
      .from("images")
      .upload(filePath, file);

    if (error) throw error;

    const {
      data: { publicUrl },
    } = supabase.storage.from("images").getPublicUrl(filePath);

    return publicUrl;
  };

  const handleGenerateDescription = async () => {
    if (!title.trim()) {
      toast.warning("Please enter a book title first");
      return;
    }

    setGeneratingDescription(true);
    try {
      const generatedDescription = await generateBookDescription(
        title.trim(),
        author.trim()
      );
      setDescription(generatedDescription);
      toast.success("Description generated successfully!");
    } catch (error) {
      toast.error("Failed to generate description. Please try again.");
    } finally {
      setGeneratingDescription(false);
    }
  };

  const handleCoverGenerated = async (generatedImageDataUrl) => {
    setApplyingCover(true);
    try {
      // Convert base64 data URL to blob
      const response = await fetch(generatedImageDataUrl);
      const blob = await response.blob();

      // Create a file from the blob
      const fileName = `generated-cover-${Date.now()}.png`;
      const file = new File([blob], fileName, { type: 'image/png' });

      // Upload the generated cover
      const coverUrl = await uploadImage(file);

      // Update the cover preview and state
      setCoverImage(file);
      setPreviewUrl(coverUrl);
      setExistingCoverUrl(coverUrl);

      setShowCoverGenerator(false);
      toast.success("Cover generated and applied successfully!");
    } catch (error) {
      console.error("Error applying generated cover:", error);
      toast.error("Failed to apply generated cover. Please try again.");
    } finally {
      setApplyingCover(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.warning("Please enter a book title");
      return;
    }

    setUploading(true);
    try {
      let coverImageUrl = existingCoverUrl;

      if (coverImage) {
        coverImageUrl = await uploadImage(coverImage);
      }

      const { data, error } = await supabase
        .from("books")
        .update({
          title: title.trim(),
          author: author.trim() || null,
          description: description.trim() || null,
          count: count,
          cover_image_url: coverImageUrl,
        })
        .eq("id", id);

      if (error) throw error;

      toast.success("Book updated successfully!");
      window.location.href = "/books";
    } catch (error) {
      console.error("Error updating book:", error);
      toast.error("Failed to update book: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  if (roleLoading || loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Edit Book</h1>
            <button
              onClick={() => (window.location.href = "/books")}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium cursor-pointer"
            >
              ← Back to Books
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="title"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Book Title *
                </label>
                <input
                  type="text"
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter book title"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="count"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Number of Copies *
                </label>
                <input
                  type="number"
                  id="count"
                  value={count}
                  onChange={(e) =>
                    setCount(Math.max(1, parseInt(e.target.value) || 1))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter number of copies"
                  min="1"
                  required
                />
                <p className="text-sm text-gray-500 mt-1">
                  How many copies of this book are available?
                </p>
              </div>

              <div>
                <label
                  htmlFor="author"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Author
                </label>
                <input
                  type="text"
                  id="author"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter author name (optional)"
                />
                <p className="text-sm text-gray-500 mt-1">Book author's name</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label
                    htmlFor="description"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Description
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateDescription}
                    disabled={generatingDescription || !title.trim()}
                    className="flex items-center gap-2 bg-linear-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-2 px-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 text-sm"
                  >
                    <Wand2 className="w-4 h-4" />
                    {generatingDescription ? "Generating..." : "AI Generate"}
                  </button>
                </div>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows="4"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter book description (optional)"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Brief description or summary of the book
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label
                    htmlFor="cover-image"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Cover Image
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowCoverGenerator(true)}
                    className="flex items-center gap-2 bg-linear-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white font-semibold py-2 px-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 text-sm"
                  >
                    <Wand2 className="w-4 h-4" />
                    Generate Cover
                  </button>
                </div>
                <input
                  type="file"
                  id="cover-image"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Optional: Upload a new cover image (JPG, PNG, etc.) or use AI generation
                </p>
              </div>

              {previewUrl && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Preview:
                  </p>
                  <div className="w-32 h-40 bg-gray-200 rounded overflow-hidden">
                    <img
                      src={previewUrl}
                      alt="Cover preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={uploading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {uploading ? "Updating Book..." : "Update Book"}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Book Cover Generator Modal */}
      {showCoverGenerator && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-900">Generate Book Cover</h2>
              <button
                onClick={() => setShowCoverGenerator(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
              <BookCoverGenerator
                initialTitle={title}
                initialAuthor={author}
                onCoverGenerated={handleCoverGenerated}
                isModal={true}
                applyingCover={applyingCover}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
