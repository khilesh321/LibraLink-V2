import { useState, useEffect } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { X, FileText, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";

const BookSummaryModal = ({ book, isOpen, onClose }) => {
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen && book && !summary) {
      generateSummary();
    }
  }, [isOpen, book]);

  const generateSummary = async () => {
    if (!book) return;

    setLoading(true);
    setError("");

    try {
      const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

      const prompt = `Generate a comprehensive and engaging summary of the book "${book.title}" by ${book.author || "Unknown"}.

Please provide:
1. **Overview**: A brief 2-3 sentence overview of what the book is about
2. **Main Themes**: The primary themes and topics covered
3. **Key Takeaways**: 3-5 main lessons or insights from the book
4. **Target Audience**: Who would benefit most from reading this book
5. **Why Read It**: Why someone should read this book

${book.description ? `Additional context: ${book.description}` : ''}

Keep the total summary between 300-500 words. Make it informative, engaging, and suitable for someone considering whether to read the book. Use markdown formatting for better readability.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const generatedSummary = response.text().trim();

      setSummary(generatedSummary);
    } catch (err) {
      console.error("Error generating book summary:", err);
      setError("Failed to generate summary. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSummary("");
    setError("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[95vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Book Summary</h2>
              <p className="text-gray-600 text-sm">
                {book?.title} by {book?.author || "Unknown"}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-4" />
              <p className="text-gray-600">Generating summary...</p>
              <p className="text-sm text-gray-500 mt-2">
                This may take a few moments
              </p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="text-red-500 text-6xl mb-4">⚠️</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Summary Generation Failed
              </h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={generateSummary}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors cursor-pointer"
              >
                Try Again
              </button>
            </div>
          ) : summary ? (
            <div className="prose prose-lg max-w-none">
              <ReactMarkdown
                components={{
                  h1: ({ children }) => (
                    <h1 className="text-2xl font-bold text-gray-900 mb-4 mt-6 first:mt-0">
                      {children}
                    </h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-xl font-semibold text-gray-900 mb-3 mt-5">
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-lg font-medium text-gray-900 mb-2 mt-4">
                      {children}
                    </h3>
                  ),
                  p: ({ children }) => (
                    <p className="text-gray-700 mb-4 leading-relaxed">
                      {children}
                    </p>
                  ),
                  ul: ({ children }) => (
                    <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal list-inside text-gray-700 mb-4 space-y-2">
                      {children}
                    </ol>
                  ),
                  li: ({ children }) => (
                    <li className="leading-relaxed">{children}</li>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-semibold text-gray-900">
                      {children}
                    </strong>
                  ),
                  em: ({ children }) => (
                    <em className="italic text-gray-700">{children}</em>
                  ),
                }}
              >
                {summary}
              </ReactMarkdown>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors cursor-pointer"
          >
            Close
          </button>
          {summary && (
            <button
              onClick={() => navigator.clipboard.writeText(summary)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors cursor-pointer"
            >
              Copy Summary
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookSummaryModal;