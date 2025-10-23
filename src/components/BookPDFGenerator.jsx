import { useState } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import jsPDF from 'jspdf';

const BookPDFGenerator = () => {
  const [topic, setTopic] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedBook, setGeneratedBook] = useState(null);

  const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const generateBookContent = async () => {
    if (!topic.trim()) return;

    setIsLoading(true);
    try {
      const prompt = `Generate a creative book title and a compelling 2-3 paragraph description for a book about: "${topic}"

Please format your response as JSON with the following structure:
{
  "title": "Book Title Here",
  "description": "First paragraph of description.\\n\\nSecond paragraph of description.\\n\\nThird paragraph if needed."
}

Make the title engaging and the description informative and enticing. The description should be suitable for a book cover or marketing material.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Parse the JSON response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const bookData = JSON.parse(jsonMatch[0]);
        setGeneratedBook(bookData);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Error generating book content:', error);
      alert('Failed to generate book content. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const generatePDF = () => {
    if (!generatedBook) return;

    const pdf = new jsPDF();

    // Set margins
    const margin = 20;
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const contentWidth = pageWidth - (margin * 2);

    // Add title
    pdf.setFontSize(24);
    pdf.setFont('helvetica', 'bold');
    const titleLines = pdf.splitTextToSize(generatedBook.title, contentWidth);
    let yPosition = margin + 30;

    titleLines.forEach((line) => {
      pdf.text(line, margin, yPosition);
      yPosition += 15;
    });

    // Add some space after title
    yPosition += 20;

    // Add description
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    const descriptionLines = pdf.splitTextToSize(generatedBook.description, contentWidth);

    descriptionLines.forEach((line) => {
      if (yPosition > pageHeight - margin - 20) {
        pdf.addPage();
        yPosition = margin + 20;
      }
      pdf.text(line, margin, yPosition);
      yPosition += 7;
    });

    // Save the PDF
    const fileName = `${generatedBook.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
    pdf.save(fileName);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      generateBookContent();
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-lg">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Book PDF Generator</h2>
        <p className="text-gray-600">Generate creative book ideas and create downloadable PDFs</p>
      </div>

      <div className="space-y-6">
        {/* Input Section */}
        <div className="space-y-4">
          <label htmlFor="topic" className="block text-sm font-medium text-gray-700">
            Book Topic or Idea
          </label>
          <textarea
            id="topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Enter a book topic, genre, or concept (e.g., 'time travel adventure', 'cooking for beginners', 'mysterious detective story')"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-colors"
            rows={4}
            disabled={isLoading}
          />
        </div>

        {/* Generate Button */}
        <button
          onClick={generateBookContent}
          disabled={!topic.trim() || isLoading}
          className="w-full bg-linear-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 transform hover:scale-105 disabled:hover:scale-100"
        >
          {isLoading ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Generating Book Content...</span>
            </div>
          ) : (
            'Generate Book PDF'
          )}
        </button>

        {/* Generated Content Preview */}
        {generatedBook && (
          <div className="space-y-4">
            <div className="border-t pt-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Generated Book Preview</h3>

              <div className="bg-gray-50 p-6 rounded-lg border">
                <h4 className="text-2xl font-bold text-blue-600 mb-4 leading-tight">
                  {generatedBook.title}
                </h4>
                <div className="text-gray-700 leading-relaxed whitespace-pre-line">
                  {generatedBook.description}
                </div>
              </div>
            </div>

            {/* Download PDF Button */}
            <button
              onClick={generatePDF}
              className="w-full bg-linear-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 flex items-center justify-center space-x-2"
            >
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
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <span>Download PDF</span>
            </button>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h4 className="text-sm font-semibold text-blue-800 mb-2">How it works:</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Enter a book topic or idea in the text area above</li>
          <li>• Click "Generate Book PDF" to create AI-generated content</li>
          <li>• Review the generated title and description</li>
          <li>• Download your book concept as a professional PDF</li>
        </ul>
      </div>
    </div>
  );
};

export default BookPDFGenerator;