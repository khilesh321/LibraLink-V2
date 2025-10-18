import { useState } from "react";
import { supabase } from "../supabase/supabaseClient";
import useUserRole from "../supabase/useUserRole";
import { toast } from "react-toastify";
import { generateBookDescription } from "../utils/geminiUtils";
import BookCoverGenerator from "./BookCoverGenerator";

export default function AddBook() {
  const { role, loading: roleLoading } = useUserRole();
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [description, setDescription] = useState("");
  const [count, setCount] = useState(1);
  const [coverImage, setCoverImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [generatingDescription, setGeneratingDescription] = useState(false);
  const [showCoverGenerator, setShowCoverGenerator] = useState(false);
  const [generatedCoverUrl, setGeneratedCoverUrl] = useState(null);

  // Check if user has permission
  if (!roleLoading && (!role || (role !== "admin" && role !== "librarian"))) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Access Denied
          </h1>
          <p className="text-gray-600">
            You don't have permission to add books.
          </p>
          <button
            onClick={() => (window.location.href = "/books")}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-300"
          >
            Back to Books
          </button>
        </div>
      </div>
    );
  }

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

  const uploadGeneratedCover = async (dataUrl) => {
    // Convert base64 data URL to blob
    const response = await fetch(dataUrl);
    const blob = await response.blob();

    // Create a File object from the blob
    const fileName = `generated-cover-${Date.now()}.png`;
    const file = new File([blob], fileName, { type: 'image/png' });

    return await uploadImage(file);
  };

  const handleGenerateDescription = async () => {
    if (!title.trim()) {
      toast.warning("Please enter a book title first");
      return;
    }

    if (!author.trim()) {
      toast.warning("Please enter an author name first");
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
      toast.error(error.message);
    } finally {
      setGeneratingDescription(false);
    }
  };

  const handleCoverGenerated = (coverUrl) => {
    // This function will be called when a cover is successfully generated
    // For now, it handles the case where image generation works
    if (coverUrl) {
      setGeneratedCoverUrl(coverUrl);
      setPreviewUrl(coverUrl);
      setShowCoverGenerator(false);
      toast.success("Cover generated and applied!");
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
      let coverImageUrl = null;

      // Upload image from file input or generated cover
      if (coverImage) {
        coverImageUrl = await uploadImage(coverImage);
      } else if (generatedCoverUrl) {
        coverImageUrl = await uploadGeneratedCover(generatedCoverUrl);
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase.from("books").insert([
        {
          title: title.trim(),
          author: author.trim() || null,
          description: description.trim() || null,
          count: count,
          cover_image_url: coverImageUrl,
          created_by: user.id,
        },
      ]);

      if (error) throw error;

      toast.success("Book added successfully!");
      setTitle("");
      setAuthor("");
      setDescription("");
      setCount(1);
      setCoverImage(null);
      setPreviewUrl(null);
      setGeneratedCoverUrl(null);

      // Reset file input
      const fileInput = document.getElementById("cover-image");
      if (fileInput) fileInput.value = "";
    } catch (error) {
      toast.error("Failed to add book: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  if (roleLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Add New Book</h1>
            <button
              onClick={() => (window.location.href = "/books")}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
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
                    disabled={
                      generatingDescription || !title.trim() || !author.trim()
                    }
                    className="text-sm bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-3 py-1 rounded-md transition duration-300 disabled:cursor-not-allowed"
                  >
                    {generatingDescription
                      ? "Generating..."
                      : "Generate with AI"}
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
                  Brief description or summary of the book. Use AI to generate
                  one based on title and author.
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
                    disabled={!title.trim() || !author.trim()}
                    className="text-sm bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white px-3 py-1 rounded-md transition duration-300 disabled:cursor-not-allowed"
                  >
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
                  Optional: Upload a cover image or generate one with AI
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
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? "Adding Book..." : "Add Book"}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Cover Generator Modal */}
      {showCoverGenerator && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Generate Book Cover
              </h2>
              <button
                onClick={() => setShowCoverGenerator(false)}
                className="text-gray-400 hover:text-gray-600 transition duration-200"
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
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
