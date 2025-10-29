import { useState } from "react";
import { generateBookCover, generateCoverDescription } from "../utils/geminiUtils";
import { toast } from "react-toastify";

export default function BookCoverGenerator({ initialTitle = "", initialAuthor = "", onCoverGenerated, isModal = false, applyingCover = false }) {
  const [title, setTitle] = useState(initialTitle);
  const [author, setAuthor] = useState(initialAuthor);
  const [description, setDescription] = useState("");
  const [generatedImage, setGeneratedImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [generatingDescription, setGeneratingDescription] = useState(false);
  const [selectedModel, setSelectedModel] = useState("provider-5/midjourney-v7");

  const handleGenerateCover = async (e) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.warning("Please enter a book title");
      return;
    }

    if (!author.trim()) {
      toast.warning("Please enter an author name");
      return;
    }

    setLoading(true);
    setError(null);
    setGeneratedImage(null);

    try {
      const imageData = await generateBookCover(
        title.trim(),
        author.trim(),
        description.trim(),
        selectedModel
      );
      setGeneratedImage(imageData);
      toast.success("Book cover generated successfully!");
    } catch (error) {
      setError(error.message);
      toast.error(description.trim() ? "Generation failed. Try removing or simplifying the description." : "Failed to generate book cover. Please try again.");
    } finally {
      setLoading(false);
    }
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
      const generatedDescription = await generateCoverDescription(
        title.trim(),
        author.trim()
      );
      setDescription(generatedDescription);
      toast.success("Cover description generated successfully!");
    } catch (error) {
      toast.error("Failed to generate cover description. Please try again.");
    } finally {
      setGeneratingDescription(false);
    }
  };

  const handleDownloadCover = () => {
    if (!generatedImage) return;

    const link = document.createElement("a");
    link.href = generatedImage;
    link.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_cover.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Cover downloaded successfully!");
  };

  const handleReset = () => {
    setTitle("");
    setAuthor("");
    setDescription("");
    setGeneratedImage(null);
    setError(null);
    setGeneratingDescription(false);
    setSelectedModel("provider-4/qwen-image");
  };

  return (
    <div className={isModal ? "p-6" : "min-h-screen bg-linear-to-br from-purple-50 to-blue-100"}>
      {!isModal && (
        <>
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              AI Book Cover Generator
            </h1>
            <p className="text-lg text-gray-600 mb-4">
              Generate professional book covers using AI
            </p>
          </div>
        </>
      )}

      <div data-lenis-prevent className={isModal ? "" : "container mx-auto px-4 py-8"}>
        <div className={isModal ? "" : "max-w-4xl mx-auto"}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Input Form */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                Book Details
              </h2>

              <form onSubmit={handleGenerateCover} className="space-y-6">
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition duration-200"
                    placeholder="Enter book title"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="author"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Author Name *
                  </label>
                  <input
                    type="text"
                    id="author"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition duration-200"
                    placeholder="Enter author name"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="model"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    AI Model
                  </label>
                  <div className="relative">
                    <select
                      id="model"
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition duration-200 bg-white appearance-none cursor-pointer"
                    >
                      <option value="provider-5/midjourney-v7">✨ Midjourney V7 - Artistic & Abstract Design (Recommended)</option>
                      <option value="provider-4/qwen-image">🎨 Qwen Image - Creative & Artistic</option>
                      <option value="provider-4/imagen-4">✨ Imagen 4 - Clean & Minimal Design</option>
                      <option value="provider-4/imagen-3">✨ Imagen 3 - Clean & Minimal Design</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  <div className="mt-2 space-y-1">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Qwen Image:</span> Great for creative, artistic covers with rich details and imaginative designs
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Imagen 4:</span> Perfect for clean, professional, and minimalist book cover designs
                    </p>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label
                      htmlFor="description"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Cover Style Description (Optional)
                    </label>
                    <button
                      type="button"
                      onClick={handleGenerateDescription}
                      disabled={generatingDescription || !title.trim() || !author.trim()}
                      className="flex items-center gap-2 bg-linear-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-2 px-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 text-sm cursor-pointer"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      {generatingDescription ? "Generating..." : "AI Generate"}
                    </button>
                  </div>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows="4"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition duration-200 resize-none"
                    placeholder="Describe the visual style, mood, and design elements you want for the cover (e.g., 'modern minimalist with cool blue tones', 'mysterious thriller with dark shadows')"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Help the AI understand the visual style and mood you want, or generate one automatically for cover design
                  </p>
                </div>

                <div className="flex space-x-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-linear-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 disabled:hover:scale-100"
                  >
                    {loading ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Generating Cover...
                      </div>
                    ) : (
                      "Generate Cover"
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition duration-200"
                  >
                    Reset
                  </button>
                </div>
              </form>

              {error && (
                <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start">
                    <div className="text-red-500 mr-3 mt-0.5">
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-red-700 text-sm font-medium">Generation Failed</p>
                      <p className="text-red-700 text-sm mt-1">{error}</p>
                      {error.includes("quota exceeded") && (
                        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                          <p className="text-blue-800 text-sm font-medium mb-2">💡 Upgrade Options:</p>
                          <ul className="text-blue-700 text-sm space-y-1">
                            <li>• <strong>Google AI Studio:</strong> Upgrade to a paid plan for higher limits</li>
                            <li>• <strong>Alternative Services:</strong> Consider DALL-E, Midjourney, or Stable Diffusion</li>
                            <li>• <strong>Canva:</strong> Use their AI image generator with more generous free tier</li>
                          </ul>
                        </div>
                      )}
                      {description.trim() && (
                        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                          <p className="text-yellow-800 text-sm font-medium mb-2">💡 Try This:</p>
                          <ul className="text-yellow-700 text-sm space-y-1">
                            <li>• <strong>Remove the description:</strong> Try generating without any description text</li>
                            <li>• <strong>Use a shorter description:</strong> Simplify your description to basic style keywords</li>
                            <li>• <strong>Example:</strong> Instead of a long paragraph, try "modern minimalist with blue tones"</li>
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Generated Cover Display */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                Generated Cover
              </h2>

              <div className="flex flex-col items-center justify-center min-h-[400px]">
                {loading ? (
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto mb-4"></div>
                    <p className="text-lg text-gray-600 mb-2">
                      Creating your book cover...
                    </p>
                    <p className="text-sm text-gray-500">
                      This may take a few moments
                    </p>
                  </div>
                ) : generatedImage ? (
                  <div className="text-center">
                    <div className="mb-6 bg-gray-100 p-4 rounded-lg shadow-inner">
                      <img
                        src={generatedImage}
                        alt={`Book cover for "${title}" by ${author}`}
                        className="max-w-full max-h-96 mx-auto rounded-lg shadow-lg"
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="flex space-x-3">
                        <button
                          onClick={handleDownloadCover}
                          className="flex-1 bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 px-6 rounded-lg transition duration-300 transform hover:scale-105 flex items-center justify-center"
                        >
                          <svg
                            className="w-5 h-5 mr-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                          Download Cover
                        </button>

                        <button
                          onClick={() => {
                            if (onCoverGenerated) {
                              onCoverGenerated(generatedImage);
                              // toast.success("Cover applied successfully!");
                            }
                          }}
                          disabled={applyingCover}
                          className="flex-1 bg-linear-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-3 px-6 rounded-lg transition duration-300 transform hover:scale-105 disabled:hover:scale-100 flex items-center justify-center"
                        >
                          {applyingCover ? (
                            <>
                              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Applying...
                            </>
                          ) : (
                            <>
                              <svg
                                className="w-5 h-5 mr-2"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                              Apply Cover
                            </>
                          )}
                        </button>
                      </div>

                      <p className="text-sm text-gray-500 text-center">
                        Download saves as PNG file • Apply uses the cover in your book upload
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-500">
                    <div className="w-24 h-24 mx-auto mb-4 bg-gray-200 rounded-lg flex items-center justify-center">
                      <svg
                        className="w-12 h-12 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                    <p className="text-lg mb-2">No cover generated yet</p>
                    <p className="text-sm">
                      Fill in the book details and click "Generate Cover"
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tips Section */}
          {!isModal && (
            <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                💡 Tips for Better Covers
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Genre-Specific Prompts</h4>
                  <ul className="space-y-1">
                    <li>• Mystery/Thriller: "dark, suspenseful, shadowy"</li>
                    <li>• Romance: "warm colors, elegant, romantic"</li>
                    <li>• Sci-Fi: "futuristic, technological, cosmic"</li>
                    <li>• Fantasy: "magical, mystical, adventurous"</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Style Suggestions</h4>
                  <ul className="space-y-1">
                    <li>• Modern: "clean, minimalist, contemporary"</li>
                    <li>• Classic: "vintage, elegant, traditional"</li>
                    <li>• Artistic: "abstract, creative, unique"</li>
                    <li>• Professional: "corporate, polished, refined"</li>
                  </ul>
                </div>
              </div>
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start">
                  <div className="text-yellow-600 mr-3 mt-0.5">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-yellow-800 font-medium">Rate Limits & Quotas</p>
                    <p className="text-yellow-700 text-sm mt-1">
                      Gemini AI has rate limits on the free tier. If you hit quota limits, consider upgrading to a paid plan or using alternative image generation services for more generous limits.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}