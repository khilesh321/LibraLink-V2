import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../supabase/supabaseClient";
import useUserRole from "../supabase/useUserRole";
import { toast } from "react-toastify";

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
            You don't have permission to edit books.
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
            <h1 className="text-3xl font-bold text-gray-900">Edit Book</h1>
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
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Description
                </label>
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
                <label
                  htmlFor="cover-image"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Cover Image
                </label>
                <input
                  type="file"
                  id="cover-image"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Optional: Upload a new cover image (JPG, PNG, etc.)
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
                {uploading ? "Updating Book..." : "Update Book"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
