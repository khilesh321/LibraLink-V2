import { useState, useEffect } from "react";
import { supabase } from "../supabase/supabaseClient";
import useUserRole from "../supabase/useUserRole";
import {
  X,
  FileText,
  User,
  Calendar,
  Hash,
  Download,
  Eye,
  ExternalLink,
  Wand2,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "react-toastify";
import { GoogleGenerativeAI } from "@google/generative-ai";

export default function ResourcesDetailsModal({ documentId, isOpen, onClose }) {
  const { role, loading: roleLoading } = useUserRole();
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [summary, setSummary] = useState("");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (isOpen && documentId) {
      fetchDocumentDetails();
    }
  }, [isOpen, documentId]);

  const fetchDocumentDetails = async () => {
    setLoading(true);
    try {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUser(user);

      // Fetch document details
      const { data: documentData, error: documentError } = await supabase
        .from("documents")
        .select("*")
        .eq("id", documentId)
        .single();

      if (documentError) throw documentError;

      setDocument(documentData);
      setSummary(documentData.summary || "");
    } catch (error) {
      console.error("Error fetching document details:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateSummary = async () => {
    if (!document) return;

    setGeneratingSummary(true);
    try {
      // Initialize Gemini AI
      const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

      const prompt = `Generate a comprehensive summary of the document titled "${document.name}". Based on the description: "${document.description || 'No description available'}". Create a detailed summary that captures the key points, main topics, and value of this document. Keep it informative and engaging.`;

      const result = await model.generateContent(prompt);
      const generatedSummary = result.response.text();

      setSummary(generatedSummary);

      // Optionally save the summary to the database
      await supabase
        .from("documents")
        .update({ summary: generatedSummary })
        .eq("id", documentId);

      toast.success("Summary generated successfully!");
    } catch (error) {
      console.error("Error generating summary:", error);
      toast.error("Failed to generate summary. Please try again.");
    } finally {
      setGeneratingSummary(false);
    }
  };

  const handleDownload = async () => {
    if (!document) return;

    setDownloading(true);
    try {
      const { data, error } = await supabase.storage
        .from("books")
        .download(document.filepath);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = window.document.createElement("a");
      a.href = url;
      a.download = document.filename;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Download started!");
    } catch (error) {
      console.error("Error downloading document:", error);
      toast.error("Failed to download document");
    } finally {
      setDownloading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (!isOpen) return null;

  return (
    <div
      data-lenis-prevent
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
    >
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : document ? (
          <>
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <FileText className="w-6 h-6" />
                Document Details
              </h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Document Cover */}
                <div className="lg:col-span-1">
                  <div className="aspect-w-3 aspect-h-4 bg-gray-200 rounded-lg overflow-hidden">
                    {document.cover_image_url ? (
                      <img
                        src={document.cover_image_url}
                        alt={document.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-linear-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                        <FileText className="w-16 h-16 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* File Info */}
                  <div className="mt-4 p-3 rounded-lg border">
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gray-500" />
                        <span className="font-medium">{document.filename}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Hash className="w-4 h-4 text-gray-500" />
                        <span>Size: {formatFileSize(document.size)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Document Information */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Basic Info */}
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {document.name}
                    </h3>
                    <div className="flex items-center gap-2 text-gray-600 mb-4">
                      <User className="w-4 h-4" />
                      <span>Uploaded by Librarian</span>
                    </div>
                  </div>

                  {/* Description */}
                  {document.description && (
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-3">
                        Description
                      </h4>
                      <div className="prose prose-sm max-w-none text-gray-700">
                        <ReactMarkdown>{document.description}</ReactMarkdown>
                      </div>
                    </div>
                  )}

                  {/* Summary */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-lg font-semibold text-gray-900">
                        Summary
                      </h4>
                      <button
                        onClick={generateSummary}
                        disabled={generatingSummary}
                        className="flex items-center gap-2 bg-linear-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-2 px-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 text-sm cursor-pointer"
                      >
                        <Wand2 className="w-4 h-4" />
                        {generatingSummary ? "Generating..." : "Generate Summary"}
                      </button>
                    </div>
                    {summary ? (
                      <div className="prose prose-sm max-w-none text-gray-700 bg-gray-50 p-4 rounded-lg">
                        <ReactMarkdown>{summary}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-gray-500 italic">
                        No summary available. Click "Generate Summary" to create one.
                      </p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  {currentUser && role && !roleLoading && (
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-3">
                        Actions
                      </h4>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <button
                          onClick={handleDownload}
                          disabled={downloading}
                          className="flex-1 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl disabled:shadow-none transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                        >
                          {downloading ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              <span>Downloading...</span>
                            </>
                          ) : (
                            <>
                              <Download className="w-4 h-4" />
                              <span>Download PDF</span>
                            </>
                          )}
                        </button>
                        {document.flipbook_url && (
                          <a
                            href={document.flipbook_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 bg-linear-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <ExternalLink className="w-4 h-4" />
                            View Flipbook
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Hash className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-600">Document ID:</span>
                        <span className="text-sm font-mono text-gray-900">
                          {typeof document.id === 'string' ? document.id.slice(0, 8) : String(document.id).slice(0, 8)}...
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-600">Uploaded:</span>
                        <span className="text-sm text-gray-900">
                          {formatDate(document.created_at)}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-600">File Type:</span>
                        <span className="text-sm text-gray-900">PDF</span>
                      </div>

                      {document.updated_at &&
                        document.updated_at !== document.created_at && (
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-500" />
                            <span className="text-sm text-gray-600">
                              Updated:
                            </span>
                            <span className="text-sm text-gray-900">
                              {formatDate(document.updated_at)}
                            </span>
                          </div>
                        )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-600">Document not found</p>
          </div>
        )}
      </div>
    </div>
  );
}