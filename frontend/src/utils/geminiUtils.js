import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

/**
 * Generate a book description using Gemini AI
 * @param {string} title - Book title
 * @param {string} author - Book author
 * @returns {Promise<string>} Generated description
 */
export const generateBookDescription = async (title, author) => {
  try {
    const prompt = `Generate a compelling and informative book description for the following book:

Title: ${title}
Author: ${author || "Unknown"}

Please provide a description that includes:
- A brief overview of what the book is about
- The main themes or topics covered
- Why someone might want to read it
- Keep it between 100-200 words

Make it engaging and suitable for a library catalog. Do not use any markdown formatting like **bold** or *italic* text. Write in plain text only.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error("Error generating book description:", error);
    throw new Error("Failed to generate description. Please try again.");
  }
};

/**
 * Generate book recommendations based on user's borrowing history
 * @param {Array} userBorrowedBooks - Array of user's last borrowed books
 * @param {Array} topBooks - Array of top 50 books in the library
 * @returns {Promise<Array>} Array of recommended books with reasoning
 */
export const generateBookRecommendations = async (
  userBorrowedBooks,
  topBooks
) => {
  try {
    const borrowedBooksText = userBorrowedBooks
      .map(
        (book) =>
          `- "${book.title}" by ${book.author || "Unknown"} (${
            book.description
              ? book.description.substring(0, 100) + "..."
              : "No description"
          })`
      )
      .join("\n");

    const topBooksText = topBooks
      .slice(0, 20)
      .map(
        (book) =>
          `- "${book.title}" by ${book.author || "Unknown"} (${
            book.description
              ? book.description.substring(0, 100) + "..."
              : "No description"
          })`
      )
      .join("\n");

    const prompt = `Based on a user's borrowing history and the top books in our library, recommend 5-8 books they might enjoy.

User's recently borrowed books:
${borrowedBooksText}

Top books in our library:
${topBooksText}

Please analyze the user's reading preferences based on their borrowing history and recommend books from the top books list that match their interests. For each recommendation, provide:

1. Book title and author
2. Brief reason why this book matches their interests
3. A relevance score (1-10, where 10 is perfect match)

Return the response as a valid JSON array of objects with this structure:
[
  {
    "title": "Book Title",
    "author": "Author Name",
    "reason": "Why this book matches their interests",
    "relevanceScore": 8
  }
]

Only return the JSON array, no additional text.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();

    // Clean up the response to ensure it's valid JSON
    const cleanedText = text
      .replace(/```json\s*/g, "")
      .replace(/```\s*$/g, "")
      .trim();

    try {
      const recommendations = JSON.parse(cleanedText);
      return recommendations;
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError);
      console.error("Raw response:", text);
      throw new Error("Failed to parse AI recommendations. Please try again.");
    }
  } catch (error) {
    console.error("Error generating book recommendations:", error);
    throw new Error("Failed to generate recommendations. Please try again.");
  }
};
