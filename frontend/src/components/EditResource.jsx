import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../supabase/supabaseClient";
import useUserRole from "../supabase/useUserRole";
import { toast } from "react-toastify";
import BookCoverGenerator from "./BookCoverGenerator";
import { generateBookDescription } from "../utils/geminiUtils";
import { Wand2 } from "lucide-react";

export default function EditResource() {
  const { role, loading: roleLoading } = useUserRole();
  const { id } = useParams();
  const [documentName, setDocumentName] = useState("");
  const [flipbookUrl, setFlipbookUrl] = useState("");
  const [description, setDescription] = useState("");
  const [coverImage, setCoverImage] = useState(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState(null);
  const [existingCoverUrl, setExistingCoverUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [showCoverGenerator, setShowCoverGenerator] = useState(false);
  const [generatingDescription, setGeneratingDescription] = useState(false);
  const [applyingCover, setApplyingCover] = useState(false);

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
        setDescription(data.description || "");
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

  const handleGenerateDescription = async () => {
    if (!documentName.trim()) {
      toast.warning("Please enter a document name first");
      return;
    }

    setGeneratingDescription(true);
    try {
      const generatedDescription = await generateBookDescription(
        documentName.trim(),
        "" // Empty author for documents
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
      const coverUrl = await uploadCoverImage(file);

      // Update the cover preview and state
      setCoverImage(file);
      setCoverPreviewUrl(coverUrl);
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
          description: description.trim() || null,
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
                <div className="flex items-center justify-between mb-2">
                  <label
                    htmlFor="description"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Description (Optional)
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateDescription}
                    disabled={generatingDescription || !documentName.trim()}
                    className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-2 px-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 text-sm"
                  >
                    <Wand2 className="w-4 h-4" />
                    {generatingDescription ? "Generating..." : "AI Generate"}
                  </button>
                </div>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter document description"
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={uploading}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Provide a description of the document content
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label
                    htmlFor="cover-input"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Cover Image (Optional)
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowCoverGenerator(true)}
                    className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white font-semibold py-2 px-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 text-sm"
                  >
                    <Wand2 className="w-4 h-4" />
                    Generate Cover
                  </button>
                </div>
                <input
                  id="cover-input"
                  type="file"
                  accept="image/*"
                  onChange={handleCoverImageChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={uploading}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Upload a new cover image for the document (JPG, PNG, etc.) or use AI generation
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
                initialTitle={documentName}
                initialAuthor=""
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
