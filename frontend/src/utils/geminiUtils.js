import OpenAI from 'openai';

const a4fApiKey = import.meta.env.VITE_A4F_API_KEY;
const a4fBaseUrl = 'https://api.a4f.co/v1';

const a4fClient = new OpenAI({
  apiKey: a4fApiKey,
  baseURL: a4fBaseUrl,
  dangerouslyAllowBrowser: true,
});

/**
 * Generate a book description using A4F AI
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

    const result = await a4fClient.chat.completions.create({
      model: "provider-5/grok-4-0709",
      messages: [
        { role: "user", content: prompt },
      ],
    });

    return result.choices[0].message.content.trim();
  } catch (error) {
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

***CRITICAL: DO NOT RECOMMEND ANY BOOKS FROM THIS BORROWING HISTORY LIST ABOVE***

Top books in our library:
${topBooksText}

Please analyze the user's reading preferences based on their borrowing history and recommend books from the top books list that match their interests.

***MANDATORY: Check each book you consider against the borrowing history list - if it appears there, DO NOT recommend it***
***ABSOLUTELY CRITICAL: NEVER recommend any book listed in the user's borrowing history above***
***MANDATORY: Only recommend books that are NOT in the borrowing history list***
***IMPORTANT: DO NOT recommend books with titles containing words like 'test', 'demo', 'sample', 'example', 'dummy', 'temp', 'temporary', or 'placeholder'***

For each recommendation, provide:

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

Only return the JSON array, no additional text.

Before finalizing your recommendations, double-check that NONE of your recommended books appear in the user's borrowing history list above. If you find any matches, remove them from your final recommendations.`;

    const result = await a4fClient.chat.completions.create({
      model: "provider-5/grok-4-0709",
      messages: [
        { role: "user", content: prompt },
      ],
    });

    const text = result.choices[0].message.content.trim();

    // Clean up the response to ensure it's valid JSON
    const cleanedText = text
      .replace(/```json\s*/g, "")
      .replace(/```\s*$/g, "")
      .trim();

    try {
      const recommendations = JSON.parse(cleanedText);
      return recommendations;
    } catch (parseError) {
      throw new Error("Failed to parse AI recommendations. Please try again.");
    }
  } catch (error) {
    throw new Error("Failed to generate recommendations. Please try again.");
  }
};

/**
 * Generate a book cover image using A4F API directly
 *
 * Uses Flux.1-schnell model for high-quality image generation with better quotas than Gemini free tier.
 *
 * @param {string} title - Book title
 * @param {string} author - Book author
 * @param {string} description - Optional cover description
 * @returns {Promise<string>} Base64 encoded image data
 */
export const generateBookCover = async (title, author, description = "") => {
  try {
    const prompt = `Professional book cover for "${title}" by ${author || 'Unknown Author'}. High quality, modern design, readable text, attractive colors.`;

    // Use fetch directly to ensure proper A4F API integration
    const response = await fetch('https://api.a4f.co/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_A4F_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "provider-4/imagen-4",
        prompt: prompt,
        n: 1,
        size: "1024x1792", // Try different aspect ratio that might be supported by imagen
        response_format: "url",
        quality: "standard"
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`A4F API error: ${response.status} ${response.statusText} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();

    // Check if response has the expected structure
    if (!data || !data.data || !Array.isArray(data.data) || data.data.length === 0) {
      throw new Error(`API returned empty data array. This might indicate content filtering or model unavailability.`);
    }

    const imageUrl = data.data[0].url;

    if (!imageUrl) {
      throw new Error('No image URL returned from API');
    }

    // Fetch the image and convert to base64
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error('Failed to fetch generated image');
    }

    const imageBlob = await imageResponse.blob();

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(imageBlob);
    });

  } catch (error) {
    // Handle specific error types
    if (error.message.includes("quota") || error.message.includes("429") || error.message.includes("Too Many Requests")) {
      throw new Error(`API quota exceeded. You've reached the limit for image generation. Please wait a few minutes before trying again, or consider upgrading your plan for higher limits.`);
    } else if (error.message.includes("model") || error.message.includes("not found") || error.message.includes("404")) {
      throw new Error("Image generation model not available. Please check your API configuration.");
    } else if (error.message.includes("permission") || error.message.includes("403") || error.message.includes("401")) {
      throw new Error("API authentication failed. Please check your A4F API key.");
    } else if (error.message.includes("billing")) {
      throw new Error("Billing issue detected. Please check your A4F billing setup and ensure you have credits available.");
    } else {
      throw new Error("Failed to generate book cover. Please try again later.");
    }
  }
};
