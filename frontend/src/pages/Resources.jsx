import { useState, useEffect } from "react";
import { supabase } from "../supabase/supabaseClient";
import useUserRole from "../supabase/useUserRole";
import { toast } from "react-toastify";

export default function Resources() {
  const [pdfs, setPdfs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedFlipbook, setSelectedFlipbook] = useState(null);
  const [readPopup, setReadPopup] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sizeFilter, setSizeFilter] = useState("all");
  const [downloadingId, setDownloadingId] = useState(null);
  const { role } = useUserRole();

  useEffect(() => {
    fetchPdfs();
  }, []);

  const fetchPdfs = async () => {
    try {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      setPdfs(data || []);
    } catch (error) {
      console.error("Error fetching PDFs:", error);
      setError("Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  const downloadPdf = async (doc) => {
    try {
      setDownloadingId(doc.id);

      // Create a signed URL for download
      const { data: signedUrlData, error } = await supabase.storage
        .from("books")
        .createSignedUrl(doc.filepath, 300); // 5 minutes expiry

      if (error) {
        throw error;
      }

      if (signedUrlData?.signedUrl) {
        // Fetch the file and create a download link
        const response = await fetch(signedUrlData.signedUrl);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        // Create a temporary link and trigger download
        const a = document.createElement("a");
        a.href = url;
        a.download = doc.name + ".pdf";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        // Clean up the object URL
        URL.revokeObjectURL(url);
      } else {
        throw new Error("Could not generate download URL");
      }
    } catch (error) {
      console.error("Error downloading PDF:", error);
      toast.error("Failed to download PDF. Please try again.");
    } finally {
      setDownloadingId(null);
    }
  };

  const readOnline = async (doc) => {
    try {
      // First try to get a public URL
      const { data: publicUrlData } = supabase.storage
        .from("books")
        .getPublicUrl(doc.filepath);

      if (publicUrlData?.publicUrl) {
        // Check if the public URL works by making a HEAD request
        const response = await fetch(publicUrlData.publicUrl, {
          method: "HEAD",
        });
        if (response.ok) {
          window.open(publicUrlData.publicUrl, "_blank");
          return;
        }
      }

      // If public URL doesn't work, create a signed URL (expires in 1 hour)
      const { data: signedUrlData, error: signedError } = await supabase.storage
        .from("books")
        .createSignedUrl(doc.filepath, 3600); // 1 hour expiry

      if (signedError) {
        throw signedError;
      }

      if (signedUrlData?.signedUrl) {
        window.open(signedUrlData.signedUrl, "_blank");
      } else {
        throw new Error("Could not generate access URL");
      }
    } catch (error) {
      console.error("Error reading PDF:", error);
      toast.error(
        "Failed to open PDF. The file might not exist or you may not have permission to access it."
      );
    }
  };

  const openReadPopup = (doc) => {
    setReadPopup(doc);
  };

  const handleReadOption = async (option) => {
    const doc = readPopup;
    setReadPopup(null);

    if (option === "flipbook") {
      setSelectedFlipbook(doc);
    } else if (option === "online") {
      await readOnline(doc);
    }
  };

  const handleEditResource = (resourceId) => {
    window.location.href = `/resources/edit/${resourceId}`;
  };

  const handleDeleteResource = async (resourceId) => {
    if (
      !confirm(
        "Are you sure you want to delete this resource? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      // First, get the resource details to delete the file from storage
      const { data: resource, error: fetchError } = await supabase
        .from("documents")
        .select("filepath")
        .eq("id", resourceId)
        .single();

      if (fetchError) throw fetchError;

      // Delete the file from storage
      if (resource?.filepath) {
        await supabase.storage.from("books").remove([resource.filepath]);
      }

      // Delete the database record
      const { error: deleteError } = await supabase
        .from("documents")
        .delete()
        .eq("id", resourceId);

      if (deleteError) throw deleteError;

      toast.success("Resource deleted successfully!");
      fetchPdfs();
    } catch (error) {
      console.error("Error deleting resource:", error);
      toast.error("Failed to delete resource: " + error.message);
    }
  };

  // Filter PDFs based on search query and file size
  const filteredPdfs = pdfs.filter((pdf) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      pdf.name?.toLowerCase().includes(query) ||
      pdf.description?.toLowerCase().includes(query);

    const fileSizeMB = pdf.size / 1024 / 1024;
    const matchesSize = sizeFilter === "all" ||
      (sizeFilter === "small" && fileSizeMB < 5) ||
      (sizeFilter === "medium" && fileSizeMB >= 5 && fileSizeMB < 20) ||
      (sizeFilter === "large" && fileSizeMB >= 20);

    return matchesSearch && matchesSize;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading resources...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">{error}</p>
          <button
            onClick={fetchPdfs}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded cursor-pointer"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
            <h1 className="text-3xl font-bold text-gray-900">
              Library Resources
            </h1>
            {["librarian", "admin"].includes(role) && (
              <a
                href="/upload"
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 inline-flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Upload PDF
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-gray-50 border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search Input */}
              <div className="flex-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg
                    className="h-5 w-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search resources by name or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer"
                  >
                    <svg
                      className="h-5 w-5 text-gray-400 hover:text-gray-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}
              </div>

              {/* File Size Filter */}
              <div className="sm:w-48">
                <select
                  value={sizeFilter}
                  onChange={(e) => setSizeFilter(e.target.value)}
                  className="block w-full py-3 px-3 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Sizes</option>
                  <option value="small">Small (&lt; 5MB)</option>
                  <option value="medium">Medium (5-20MB)</option>
                  <option value="large">Large (&gt; 20MB)</option>
                </select>
              </div>
            </div>
          </div>
          {(searchQuery || sizeFilter !== "all") && (
            <div className="text-center mt-2">
              <span className="text-sm text-gray-600">
                Found {filteredPdfs.length} resource
                {filteredPdfs.length !== 1 ? "s" : ""}
                {searchQuery && ` matching "${searchQuery}"`}
                {searchQuery && sizeFilter !== "all" && " and"}
                {sizeFilter !== "all" && ` ${sizeFilter === "small" ? "< 5MB" : sizeFilter === "medium" ? "5-20MB" : "> 20MB"}`}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        {filteredPdfs.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📚</div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              {searchQuery ? "No resources found" : "No PDFs uploaded yet"}
            </h2>
            <p className="text-gray-600 mb-6">
              {searchQuery
                ? `No resources match your search for "${searchQuery}". Try different keywords.`
                : ["librarian", "admin"].includes(role)
                ? "Be the first to upload a PDF to the library!"
                : "No documents available yet."}
            </p>
            {searchQuery ? (
              <button
                onClick={() => setSearchQuery("")}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear Search
              </button>
            ) : (
              ["librarian", "admin"].includes(role) && (
                <a
                  href="/upload"
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 inline-flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Upload Your First PDF
                </a>
              )
            )}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredPdfs.map((pdf) => (
              <div
                key={pdf.id}
                className="bg-white group relative rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow md:min-h-[72.5vh] duration-300"
              >
                <div className="w-full bg-gray-200 overflow-hidden">
                  {pdf.cover_image_url ? (
                    <img
                      src={pdf.cover_image_url}
                      alt={pdf.name}
                      className="w-full h-full md:absolute z-10 md:group-hover:scale-x-0 mx-auto object-fit transition duration-300"
                    />
                  ) : (
                    <div className="w-full h-64 bg-gray-300 flex items-center justify-center">
                      <span className="text-gray-500 text-4xl">📄</span>
                    </div>
                  )}
                </div>
                <div className={`p-6 ${pdf.cover_image_url && "md:mt-5"}`}>
                  <div className="flex items-center mb-4">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <h3
                          className="font-semibold text-gray-900 truncate mr-2"
                          title={pdf.name}
                        >
                          {pdf.name}
                        </h3>
                        {pdf.flipbook_url && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            📖 Flipbook
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        {new Date(pdf.created_at).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-500">
                        {(pdf.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={() => openReadPopup(pdf)}
                      className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white text-sm font-semibold py-2.5 px-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <span>📖</span>
                      <span>Read</span>
                    </button>
                    <button
                      onClick={() => downloadPdf(pdf)}
                      disabled={downloadingId === pdf.id}
                      className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white text-sm font-semibold py-2.5 px-4 rounded-lg shadow-md hover:shadow-lg disabled:shadow-none transition-all duration-200 flex items-center justify-center gap-1 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {downloadingId === pdf.id ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Downloading...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span>Download</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Admin/Librarian Actions */}
                  {["librarian", "admin"].includes(role) && (
                    <div className="flex space-x-2 mt-3 pt-3 border-t border-gray-200">
                      <button
                        onClick={() => handleEditResource(pdf.id)}
                        className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-sm font-semibold py-2.5 px-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteResource(pdf.id)}
                        className="flex-1 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white text-sm font-semibold py-2.5 px-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Flipbook Modal */}
      {selectedFlipbook && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedFlipbook.name}
              </h3>
              <button
                onClick={() => setSelectedFlipbook(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl cursor-pointer"
              >
                ×
              </button>
            </div>
            <div className="p-4">
              <div className="w-full h-[70vh] bg-gray-100 rounded">
                <iframe
                  src={selectedFlipbook.flipbook_url}
                  className="w-full h-full rounded"
                  title={`Flipbook: ${selectedFlipbook.name}`}
                  allowFullScreen
                />
              </div>
              <div className="mt-4 text-center">
                <p className="text-sm text-gray-600">
                  Interactive flipbook powered by FlipHTML5
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Read Options Popup */}
      {readPopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                Read Options
              </h3>
              <button
                onClick={() => setReadPopup(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl cursor-pointer"
              >
                ×
              </button>
            </div>
            <div className="p-4 space-y-3">
              {readPopup.flipbook_url && (
                <button
                  onClick={() => handleReadOption("flipbook")}
                  className="w-full bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white font-semibold py-3 px-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>📖</span>
                  <span>Read as Flipbook</span>
                </button>
              )}
              <button
                onClick={() => handleReadOption("online")}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-3 px-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>🌐</span>
                <span>Read Online</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
