import { useState } from "react";
import { supabase } from "../supabase/supabaseClient";
import useUserRole from "../supabase/useUserRole";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { FileText, Wand2 } from "lucide-react";
import { toast } from "react-toastify";

export default function PdfUpload() {
  const [file, setFile] = useState(null);
  const [documentName, setDocumentName] = useState("");
  const [flipbookUrl, setFlipbookUrl] = useState("");
  const [coverImage, setCoverImage] = useState(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [description, setDescription] = useState("");
  const [generatingDescription, setGeneratingDescription] = useState(false);
  const { role, loading } = useUserRole();

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === "application/pdf") {
      setFile(selectedFile);
      // Set initial document name from filename (without extension)
      const nameWithoutExt = selectedFile.name.replace(/\.pdf$/i, "");
      setDocumentName(nameWithoutExt);
      setMessage("");
    } else {
      setFile(null);
      setDocumentName("");
      setMessage("Please select a valid PDF file.");
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
      setCoverPreviewUrl(null);
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

  const generateDescription = async () => {
    if (!file) {
      toast.error("Please select a PDF file first");
      return;
    }

    setGeneratingDescription(true);
    try {
      // Initialize Gemini AI
      const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

      const prompt = `Generate a brief, engaging description for a document titled "${documentName}". This appears to be a PDF document. Create a description that would help users understand what this document contains and why they might be interested in reading it. Keep it under 200 words.`;

      const result = await model.generateContent(prompt);
      const generatedDescription = result.response.text();

      setDescription(generatedDescription);
      toast.success("Description generated successfully!");
    } catch (error) {
      console.error("Error generating description:", error);
      toast.error("Failed to generate description. Please try again.");
    } finally {
      setGeneratingDescription(false);
    }
  };

  const handleUpload = async () => {
    if (!["librarian", "admin"].includes(role)) {
      setMessage(
        "Access denied. Only librarians and admins can upload documents."
      );
      return;
    }

    if (!file || !documentName.trim()) {
      setMessage("Please select a PDF file and enter a document name.");
      return;
    }

    setUploading(true);
    setMessage("");

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `pdfs/${fileName}`;

      // Upload PDF file to storage
      const { data: storageData, error: storageError } = await supabase.storage
        .from("books")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (storageError) {
        throw storageError;
      }

      // Upload cover image if provided
      let coverImageUrl = null;
      if (coverImage) {
        coverImageUrl = await uploadCoverImage(coverImage);
      }

      // Save document metadata to database
      const { data: dbData, error: dbError } = await supabase
        .from("documents")
        .insert([
          {
            name: documentName.trim(),
            filename: fileName,
            filepath: filePath,
            size: file.size,
            flipbook_url: flipbookUrl.trim() || null,
            cover_image_url: coverImageUrl,
            description: description.trim() || null,
            uploaded_by: (await supabase.auth.getUser()).data.user?.id,
          },
        ]);

      if (dbError) {
        // If database insert fails, try to delete the uploaded files
        await supabase.storage.from("books").remove([filePath]);
        if (coverImageUrl) {
          // Note: We can't easily delete from images bucket without the file path
          // In production, you might want to implement cleanup logic
        }
        throw dbError;
      }

      setMessage("PDF uploaded successfully!");
      setFile(null);
      setDocumentName("");
      setFlipbookUrl("");
      setDescription("");
      setCoverImage(null);
      setCoverPreviewUrl(null);
      // Reset file inputs
      document.getElementById("pdf-input").value = "";
      document.getElementById("cover-input").value = "";
    } catch (error) {
      console.error("Error uploading PDF:", error);
      setMessage("Error uploading PDF. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-md">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  console.log(role);
  if (!["librarian", "admin"].includes(role)) {
    return (
      <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-md">
        <div className="text-center">
          <div className="text-red-500 text-4xl mb-4">🚫</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Access Denied
          </h3>
          <p className="text-gray-600">
            Only librarians and admins can upload documents.
          </p>
          {role === "student" && (
            <p className="text-sm text-gray-500 mt-2">
              Your current role: Student
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-xl font-semibold mb-4 text-gray-800">Upload PDF</h3>

      <div className="mb-4">
        <input
          id="pdf-input"
          type="file"
          accept=".pdf"
          onChange={handleFileChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={uploading}
        />
      </div>

      {file && (
        <div className="mb-4">
          <label
            htmlFor="document-name"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Document Name
          </label>
          <input
            id="document-name"
            type="text"
            value={documentName}
            onChange={(e) => setDocumentName(e.target.value)}
            placeholder="Enter document name"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={uploading}
          />
        </div>
      )}

      {file && (
        <div className="mb-4">
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
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={uploading}
          />
          <p className="text-xs text-gray-500 mt-1">
            Enter your FlipHTML5 flipbook URL for interactive reading experience
          </p>
        </div>
      )}

      {file && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-700"
            >
              Description
            </label>
            <button
              onClick={generateDescription}
              disabled={generatingDescription}
              className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-2 px-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 text-sm cursor-pointer"
            >
              <Wand2 className="w-4 h-4" />
              {generatingDescription ? "Generating..." : "Auto Generate"}
            </button>
          </div>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter a description for the document..."
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-vertical"
            disabled={uploading}
          />
          <p className="text-xs text-gray-500 mt-1">
            Provide a description of the document content
          </p>
        </div>
      )}

      {file && (
        <div className="mb-4">
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
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={uploading}
          />
          <p className="text-xs text-gray-500 mt-1">
            Upload a cover image for the document (JPG, PNG, etc.)
          </p>
        </div>
      )}

      {coverPreviewUrl && (
        <div className="mb-4">
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
        onClick={handleUpload}
        disabled={!file || !documentName.trim() || uploading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition duration-200"
      >
        {uploading ? "Uploading..." : "Upload PDF"}
      </button>

      {message && (
        <p
          className={`mt-4 text-sm ${
            message.includes("Error") ? "text-red-600" : "text-green-600"
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
