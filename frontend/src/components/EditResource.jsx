import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../supabase/supabaseClient";
import useUserRole from "../supabase/useUserRole";
import { toast } from "react-toastify";

export default function EditResource() {
  const { role, loading: roleLoading } = useUserRole();
  const { id } = useParams();
  const [documentName, setDocumentName] = useState("");
  const [flipbookUrl, setFlipbookUrl] = useState("");
  const [coverImage, setCoverImage] = useState(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState(null);
  const [existingCoverUrl, setExistingCoverUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  // Check if user has permission
  if (!roleLoading && (!role || !["librarian", "admin"].includes(role))) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Access Denied
          </h1>
          <p className="text-gray-600">
            You don't have permission to edit resources.
          </p>
          <button
            onClick={() => (window.location.href = "/resources")}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-300"
          >
            Back to Resources
          </button>
        </div>
      </div>
    );
  }

  useEffect(() => {
    fetchResource();
  }, [id]);

  const fetchResource = async () => {
    try {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      if (data) {
        setDocumentName(data.name || "");
        setFlipbookUrl(data.flipbook_url || "");
        setExistingCoverUrl(data.cover_image_url);
        setCoverPreviewUrl(data.cover_image_url);
      }
    } catch (error) {
      console.error("Error fetching resource:", error);
      setMessage("Failed to load resource data: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCoverImageChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type.startsWith("image/")) {
      setCoverImage(selectedFile);
      const url = URL.createObjectURL(selectedFile);
      setCoverPreviewUrl(url);
    } else {
      setCoverImage(null);
      setCoverPreviewUrl(existingCoverUrl);
      setMessage("Please select a valid image file.");
    }
  };

  const uploadCoverImage = async (file) => {
    const fileExt = file.name.split(".").pop();
    const fileName = `cover-${Date.now()}.${fileExt}`;
    const filePath = `document-covers/${fileName}`;

    const { data, error } = await supabase.storage
      .from("images")
      .upload(filePath, file);

    if (error) throw error;

    const {
      data: { publicUrl },
    } = supabase.storage.from("images").getPublicUrl(filePath);

    return publicUrl;
  };

  const handleUpdate = async () => {
    if (!documentName.trim()) {
      setMessage("Please enter a document name.");
      return;
    }

    setUploading(true);
    setMessage("");

    try {
      let coverImageUrl = existingCoverUrl;

      // Upload new cover image if provided
      if (coverImage) {
        coverImageUrl = await uploadCoverImage(coverImage);
      }

      // Update the database record
      const { data, error } = await supabase
        .from("documents")
        .update({
          name: documentName.trim(),
          flipbook_url: flipbookUrl.trim() || null,
          cover_image_url: coverImageUrl,
        })
        .eq("id", id);

      if (error) throw error;

      setMessage("Resource updated successfully!");
      setTimeout(() => {
        window.location.href = "/resources";
      }, 1500);
    } catch (error) {
      console.error("Error updating resource:", error);
      setMessage("Error updating resource. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  if (roleLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Edit Resource</h1>
            <button
              onClick={() => (window.location.href = "/resources")}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              ← Back to Resources
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="space-y-6">
              <div>
                <label
                  htmlFor="document-name"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Document Name *
                </label>
                <input
                  id="document-name"
                  type="text"
                  value={documentName}
                  onChange={(e) => setDocumentName(e.target.value)}
                  placeholder="Enter document name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={uploading}
                />
              </div>

              <div>
                <label
                  htmlFor="flipbook-url"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  FlipHTML5 Flipbook URL (Optional)
                </label>
                <input
                  id="flipbook-url"
                  type="url"
                  value={flipbookUrl}
                  onChange={(e) => setFlipbookUrl(e.target.value)}
                  placeholder="https://fliphtml5.com/bookcase/xxxxx"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={uploading}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter your FlipHTML5 flipbook URL for interactive reading
                  experience
                </p>
              </div>

              <div>
                <label
                  htmlFor="cover-input"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Cover Image (Optional)
                </label>
                <input
                  id="cover-input"
                  type="file"
                  accept="image/*"
                  onChange={handleCoverImageChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={uploading}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Upload a new cover image for the document (JPG, PNG, etc.)
                </p>
              </div>

              {coverPreviewUrl && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Cover Preview:
                  </p>
                  <div className="w-32 h-40 bg-gray-200 rounded overflow-hidden mx-auto">
                    <img
                      src={coverPreviewUrl}
                      alt="Cover preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}

              <button
                onClick={handleUpdate}
                disabled={!documentName.trim() || uploading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition duration-300"
              >
                {uploading ? "Updating..." : "Update Resource"}
              </button>

              {message && (
                <p
                  className={`mt-4 text-sm ${
                    message.includes("Error") || message.includes("Failed")
                      ? "text-red-600"
                      : "text-green-600"
                  }`}
                >
                  {message}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
