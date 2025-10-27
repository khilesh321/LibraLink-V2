import { useState } from 'react';
import { callWithProvider } from '../utils/geminiUtils';
import jsPDF from 'jspdf';

const BookPDFGenerator = () => {
  const [topic, setTopic] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState('');
  const [generatedBook, setGeneratedBook] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [tableOfContents, setTableOfContents] = useState([]);

  // Helper function to extract JSON from markdown code blocks
  const extractJSONFromResponse = (response) => {
    try {
      // Remove markdown code block formatting if present
      let jsonText = response.trim();

      // Check if response starts with ```json or ```
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      // Try to find JSON object/array within the text
      const jsonMatch = jsonText.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (jsonMatch) {
        jsonText = jsonMatch[0];
      }

      return jsonText.trim();
    } catch (error) {
      console.error('Error extracting JSON from response:', error);
      throw new Error('Failed to parse AI response. Please try again.');
    }
  };

  const generateTableOfContents = async (bookTitle, bookDescription) => {
    const tocPrompt = `Based on this book concept, create a detailed table of contents for a full-length book (300-400 pages).

Book Title: "${bookTitle}"
Book Description: "${bookDescription}"

Create a table of contents with 12-15 chapters that would make this book comprehensive and engaging. Each chapter should have:
- Chapter number and title
- Brief 1-2 sentence description of what the chapter covers
- Estimated page count (aim for 20-35 pages per chapter)

Format as JSON:
{
  "chapters": [
    {
      "number": 1,
      "title": "Chapter Title",
      "description": "Brief description of chapter content",
      "estimatedPages": 25
    }
  ]
}

Make the chapters flow logically and build upon each other to create a complete narrative arc.`;

    const response = await callWithProvider('GEMINI', 'PRO_2_5', tocPrompt);
    const extractedJSON = extractJSONFromResponse(response);
    const tocData = JSON.parse(extractedJSON);
    return tocData.chapters;
  };

  const generateChapterContent = async (chapter, bookTitle, bookDescription, allChapters) => {
    const chapterPrompt = `Write a complete chapter for the book "${bookTitle}".

Book Overview: ${bookDescription}

Chapter Details:
- Chapter ${chapter.number}: ${chapter.title}
- Description: ${chapter.description}
- Target Length: ${chapter.estimatedPages} pages (approximately ${chapter.estimatedPages * 300} words)

Full Table of Contents for context:
${allChapters.map(ch => `Chapter ${ch.number}: ${ch.title} - ${ch.description}`).join('\n')}

Write this chapter as a complete, polished piece of content. Include:
- Engaging opening that connects to previous chapters
- Well-developed content with vivid descriptions and compelling narrative
- Natural transitions and flow
- Chapter-appropriate conclusion that leads into the next chapter
- Professional writing quality suitable for publication

Write in a narrative style appropriate for the book's genre. Make it detailed and immersive, aiming for the target word count. The content should feel like part of a complete, published book.

Return only the chapter content, no additional formatting or headers.`;

    const response = await callWithProvider('GEMINI', 'PRO_2_5', chapterPrompt);
    return response.trim();
  };

  const generateBookContent = async () => {
    if (!topic.trim()) return;

    setIsLoading(true);
    setLoadingStage('Generating book concept...');

    try {
      // Step 1: Generate basic book concept
      const conceptPrompt = `Create a comprehensive book concept for: "${topic}"

Please format your response as JSON with the following structure:
{
  "title": "Compelling Book Title",
  "description": "Detailed 4-5 paragraph description that could serve as back cover copy",
  "genre": "Primary genre (e.g., Fiction, Mystery, Self-Help, etc.)",
  "targetAudience": "Who this book is written for",
  "keyThemes": ["Theme 1", "Theme 2", "Theme 3"],
  "tone": "Writing tone (e.g., serious, humorous, inspirational, etc.)"
}

Make the title engaging, the description compelling and detailed enough to understand the full scope of the book.`;

      const conceptResponse = await callWithProvider('GEMINI', 'PRO_2_5', conceptPrompt);
      const extractedJSON = extractJSONFromResponse(conceptResponse);
      const bookConcept = JSON.parse(extractedJSON);
      setGeneratedBook(bookConcept);

      // Step 2: Generate table of contents
      setLoadingStage('Creating table of contents...');
      const toc = await generateTableOfContents(bookConcept.title, bookConcept.description);
      setTableOfContents(toc);

      // Step 3: Generate each chapter content
      const generatedChapters = [];
      for (let i = 0; i < toc.length; i++) {
        const chapter = toc[i];
        setLoadingStage(`Writing Chapter ${chapter.number}: ${chapter.title}...`);

        const chapterContent = await generateChapterContent(chapter, bookConcept.title, bookConcept.description, toc);
        generatedChapters.push({
          ...chapter,
          content: chapterContent
        });
      }

      setChapters(generatedChapters);
      setLoadingStage('Book generation complete!');

    } catch (error) {
      console.error('Error generating book content:', error);
      alert('Failed to generate book content. Please try again.');
    } finally {
      setIsLoading(false);
      setLoadingStage('');
    }
  };

  const generatePDF = () => {
    if (!generatedBook || chapters.length === 0) return;

    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    let currentPage = 1;
    let yPosition = margin;

    // Helper function to add page number and footer
    const addFooter = (pageNum) => {
      const footerY = pageHeight - 15;
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Page ${pageNum}`, pageWidth / 2, footerY, { align: 'center' });
      pdf.text(generatedBook.title, margin, footerY);
      pdf.text('Generated by LibraLink AI', pageWidth - margin, footerY, { align: 'right' });
    };

    // Helper function to check if we need a new page
    const checkNewPage = (requiredSpace = 20) => {
      if (yPosition > pageHeight - margin - requiredSpace) {
        addFooter(currentPage);
        pdf.addPage();
        currentPage++;
        yPosition = margin + 20; // Account for header space
        addHeader();
        return true;
      }
      return false;
    };

    // Helper function to add header
    const addHeader = () => {
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text(generatedBook.title, pageWidth / 2, margin + 5, { align: 'center' });
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Chapter Content - Page ${currentPage}`, pageWidth / 2, margin + 12, { align: 'center' });
      yPosition = margin + 25;
    };

    // Title Page
    pdf.setFontSize(28);
    pdf.setFont('helvetica', 'bold');
    const titleLines = pdf.splitTextToSize(generatedBook.title, contentWidth);
    yPosition = pageHeight / 2 - (titleLines.length * 15) / 2;

    titleLines.forEach((line) => {
      pdf.text(line, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;
    });

    yPosition += 30;
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`By AI Assistant`, pageWidth / 2, yPosition, { align: 'center' });

    yPosition += 20;
    pdf.setFontSize(12);
    pdf.text(generatedBook.genre, pageWidth / 2, yPosition, { align: 'center' });

    addFooter(currentPage);
    pdf.addPage();
    currentPage++;

    // Copyright Page
    yPosition = margin + 50;
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Copyright © 2025 LibraLink AI', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 20;
    pdf.text('All rights reserved. This is an AI-generated book.', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 30;
    pdf.text('Generated for educational and entertainment purposes.', pageWidth / 2, yPosition, { align: 'center' });

    addFooter(currentPage);
    pdf.addPage();
    currentPage++;

    // Table of Contents
    yPosition = margin;
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Table of Contents', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 30;

    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');

    tableOfContents.forEach((chapter) => {
      checkNewPage(15);
      const chapterText = `Chapter ${chapter.number}: ${chapter.title}`;
      const pageText = `... ${chapter.estimatedPages} pages`;

      pdf.text(chapterText, margin, yPosition);
      pdf.text(pageText, pageWidth - margin, yPosition, { align: 'right' });
      yPosition += 8;

      // Add chapter description
      pdf.setFontSize(10);
      const descLines = pdf.splitTextToSize(chapter.description, contentWidth - 20);
      descLines.forEach((line) => {
        checkNewPage(10);
        pdf.text(line, margin + 10, yPosition);
        yPosition += 6;
      });
      yPosition += 5;
      pdf.setFontSize(12);
    });

    // Generate each chapter
    chapters.forEach((chapter, index) => {
      // Chapter title page
      pdf.addPage();
      currentPage++;
      yPosition = pageHeight / 2 - 30;

      pdf.setFontSize(24);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`Chapter ${chapter.number}`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 20;

      pdf.setFontSize(18);
      const chapterTitleLines = pdf.splitTextToSize(chapter.title, contentWidth);
      chapterTitleLines.forEach((line) => {
        pdf.text(line, pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 12;
      });

      addFooter(currentPage);

      // Chapter content
      pdf.addPage();
      currentPage++;
      addHeader();

      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');

      const contentLines = pdf.splitTextToSize(chapter.content, contentWidth);
      contentLines.forEach((line) => {
        checkNewPage(8);
        pdf.text(line, margin, yPosition);
        yPosition += 6;
      });

      addFooter(currentPage);
    });

    // Save the PDF
    const fileName = `${generatedBook.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_full_book.pdf`;
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
              <span>{loadingStage || 'Generating Book Content...'}</span>
            </div>
          ) : (
            'Generate Full Book PDF'
          )}
        </button>

        {/* Generated Content Preview */}
        {generatedBook && (
          <div className="space-y-6">
            <div className="border-t pt-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Generated Book Preview</h3>

              {/* Book Concept */}
              <div className="bg-gray-50 p-6 rounded-lg border mb-6">
                <h4 className="text-2xl font-bold text-blue-600 mb-4 leading-tight">
                  {generatedBook.title}
                </h4>
                <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                  <div><strong>Genre:</strong> {generatedBook.genre}</div>
                  <div><strong>Audience:</strong> {generatedBook.targetAudience}</div>
                  <div><strong>Tone:</strong> {generatedBook.tone}</div>
                  <div><strong>Chapters:</strong> {chapters.length}</div>
                </div>
                <div className="text-gray-700 leading-relaxed whitespace-pre-line mb-4">
                  {generatedBook.description}
                </div>
                <div className="flex flex-wrap gap-2">
                  {generatedBook.keyThemes?.map((theme, index) => (
                    <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                      {theme}
                    </span>
                  ))}
                </div>
              </div>

              {/* Table of Contents */}
              {tableOfContents.length > 0 && (
                <div className="bg-white border rounded-lg p-6 mb-6">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4">Table of Contents</h4>
                  <div className="space-y-3">
                    {tableOfContents.map((chapter) => (
                      <div key={chapter.number} className="border-l-4 border-blue-200 pl-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h5 className="font-medium text-gray-800">
                              Chapter {chapter.number}: {chapter.title}
                            </h5>
                            <p className="text-sm text-gray-600 mt-1">{chapter.description}</p>
                          </div>
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            ~{chapter.estimatedPages} pages
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Chapters Preview */}
              {chapters.length > 0 && (
                <div className="bg-white border rounded-lg p-6 mb-6">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4">Chapter Previews</h4>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {chapters.slice(0, 3).map((chapter) => (
                      <div key={chapter.number} className="border rounded p-4">
                        <h5 className="font-medium text-gray-800 mb-2">
                          Chapter {chapter.number}: {chapter.title}
                        </h5>
                        <p className="text-sm text-gray-600 line-clamp-3">
                          {chapter.content.substring(0, 300)}...
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                          Word count: ~{chapter.content.split(' ').length}
                        </p>
                      </div>
                    ))}
                    {chapters.length > 3 && (
                      <p className="text-sm text-gray-500 text-center">
                        ... and {chapters.length - 3} more chapters
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Download PDF Button */}
              {chapters.length > 0 && (
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
                  <span>Download Complete Book PDF ({chapters.length} chapters)</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h4 className="text-sm font-semibold text-blue-800 mb-2">How it works:</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Enter a book topic or idea in the text area above</li>
          <li>• Click "Generate Full Book PDF" to create a complete AI-generated book</li>
          <li>• The system will generate: book concept, table of contents, and full chapter content</li>
          <li>• Review the generated book structure and chapter previews</li>
          <li>• Download your complete, publication-ready book as a professional PDF</li>
        </ul>
        <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-xs text-yellow-800">
            <strong>Note:</strong> Book generation may take several minutes as each chapter is written individually to ensure quality content.
          </p>
        </div>
      </div>
    </div>
  );
};

export default BookPDFGenerator;