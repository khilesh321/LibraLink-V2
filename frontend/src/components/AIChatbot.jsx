import { useState, useRef, useEffect } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import ReactMarkdown from 'react-markdown';
import { supabase } from '../supabase/supabaseClient';
import { generateBookRecommendations } from '../utils/geminiUtils';

const AIChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hello! I'm your AI assistant for LibraLink Library Management System. I can help you find books, explain library policies, and assist with any questions about our services. How can I help you today?",
      sender: 'ai',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const messagesEndRef = useRef(null);

  const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ 
    model: 'gemini-2.0-flash',
    systemInstruction: `You are a helpful AI assistant for LibraLink, a comprehensive library management system. Your role is to assist users with:

- Finding and recommending books based on their interests, genres, or authors
- Explaining library policies, rules, and procedures
- Helping with book searches and availability
- Providing information about library services and features
- Answering questions about book borrowing, returning, and renewal processes
- Offering reading suggestions and literary advice
- Assisting with general library navigation and usage

SPECIAL COMMANDS YOU CAN HANDLE:
1. BOOK SEARCH: When users ask to "find books about [topic]" or "search for [book name]", respond with a special command format: [BOOK_SEARCH:topic]
2. BOOK SUMMARY: When users ask to "summarize [book title]" or "give me a summary of [book]", respond with: [BOOK_SUMMARY:book_title]
3. BOOK RECOMMENDATIONS: When users ask for "recommendations" or "suggest books" without a specific topic, respond with: [BOOK_RECOMMENDATIONS]
4. TOPIC RECOMMENDATIONS: When users ask for "recommend books on [topic]" or "suggest books about [subject]", respond with: [BOOK_RECOMMENDATIONS_BY_TOPIC:topic]
5. SIMILAR BOOKS: When users ask for "books similar to [book title]" or "recommend similar books", respond with: [BOOK_SIMILAR:book_title]

Always be friendly, helpful, and knowledgeable about library operations. Remember user information and preferences throughout the conversation to provide personalized assistance. If you don't know something specific about the library's current inventory or policies, acknowledge this and suggest asking a librarian for the most up-to-date information.`
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Function to search books by topic or title
  const searchBooks = async (query) => {
    try {
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .or(`title.ilike.%${query}%,author.ilike.%${query}%,description.ilike.%${query}%`)
        .limit(10);

      if (error) throw error;

      // Get availability for each book
      const booksWithAvailability = await Promise.all(
        (data || []).map(async (book) => {
          try {
            const { data: available, error: availError } = await supabase.rpc(
              'is_book_available',
              { book_uuid: book.id }
            );

            return {
              ...book,
              available: availError ? true : available
            };
          } catch {
            return { ...book, available: true };
          }
        })
      );

      return booksWithAvailability;
    } catch (error) {
      console.error('Error searching books:', error);
      return [];
    }
  };

  // Function to generate book summary
  const generateBookSummary = async (bookTitle) => {
    try {
      const summaryModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      const prompt = `Generate a concise and engaging summary of the book "${bookTitle}". 

Please provide:
1. A brief overview (2-3 sentences)
2. Main themes or topics covered
3. Why someone might enjoy reading it
4. Target audience

Keep the total summary under 200 words. Make it informative and enticing.`;

      const result = await summaryModel.generateContent(prompt);
      const response = await result.response;
      return response.text().trim();
    } catch (error) {
      console.error('Error generating book summary:', error);
      return 'Sorry, I couldn\'t generate a summary for this book right now.';
    }
  };

  // Function to find similar books using AI
  const findSimilarBooks = async (bookTitle) => {
    try {
      // First, get all books from the database
      const { data: allBooks, error } = await supabase
        .from('books')
        .select('*')
        .limit(100); // Get more books for better matching

      if (error) throw error;

      if (!allBooks || allBooks.length === 0) {
        return [];
      }

      // Use AI to find semantically similar books
      const similarBooksModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      
      const booksText = allBooks
        .slice(0, 50) // Limit to 50 books for the prompt
        .map(book => 
          `"${book.title}" by ${book.author || 'Unknown'}: ${book.description || 'No description'}`
        )
        .join('\n');

      const prompt = `Given the book "${bookTitle}", find the 5 most similar books from this list based on themes, topics, genre, or subject matter. Consider books that would appeal to readers of "${bookTitle}".

Books in our library:
${booksText}

Return only a JSON array of the most similar book titles (exactly as they appear in the list above). Return at most 5 books. If no similar books are found, return an empty array.

Example response: ["Book Title 1", "Book Title 2", "Book Title 3"]`;

      const result = await similarBooksModel.generateContent(prompt);
      const response = await result.response;
      const text = response.text().trim();

      // Clean up the response
      const cleanedText = text
        .replace(/```json\s*/g, "")
        .replace(/```\s*$/g, "")
        .trim();

      let similarTitles;
      try {
        similarTitles = JSON.parse(cleanedText);
      } catch (parseError) {
        console.error("Error parsing AI response:", parseError);
        // Fallback: try to extract book titles from the text
        const titleMatches = text.match(/"([^"]+)"/g);
        similarTitles = titleMatches ? titleMatches.map(match => match.slice(1, -1)) : [];
      }

      // Find the actual book objects and check availability
      const similarBooks = similarTitles
        .map(title => allBooks.find(book => book.title === title))
        .filter(Boolean)
        .slice(0, 5);

      // Check availability for each book
      const availableSimilarBooks = await Promise.all(
        similarBooks.map(async (book) => {
          try {
            const { data: available, error: availError } = await supabase.rpc(
              'is_book_available',
              { book_uuid: book.id }
            );
            return { ...book, available: availError ? true : available };
          } catch {
            return { ...book, available: true };
          }
        })
      );

      return availableSimilarBooks.filter(book => book.available);
    } catch (error) {
      console.error('Error finding similar books:', error);
      return [];
    }
  };

  // Function to get book recommendations
  const getBookRecommendations = async (topic = null) => {
    try {
      if (topic) {
        // Topic-based recommendations
        const searchResults = await searchBooks(topic);
        
        if (searchResults.length === 0) {
          return { type: 'topic', available: false, books: [] };
        }

        // Return available books for the topic
        const availableBooks = searchResults.filter(book => book.available);
        return { 
          type: 'topic', 
          available: availableBooks.length > 0, 
          books: availableBooks.slice(0, 5),
          topic: topic
        };
      }

      // History-based recommendations (original functionality)
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { type: 'history', books: [] };

      // Get user's recent transactions
      const { data: transactions, error } = await supabase
        .from('book_transactions')
        .select(`
          book_id,
          books (
            id,
            title,
            author,
            description
          )
        `)
        .eq('user_id', user.id)
        .eq('action', 'issue')
        .order('transaction_date', { ascending: false })
        .limit(5);

      if (error) throw error;

      const userBorrowedBooks = transactions?.map(t => t.books).filter(Boolean) || [];

      // Get top books from library
      const { data: topBooks } = await supabase
        .from('books')
        .select('*')
        .limit(50);

      if (userBorrowedBooks.length === 0) {
        // If no borrowing history, return popular books
        return { 
          type: 'history', 
          books: topBooks?.slice(0, 5).map(book => ({
            title: book.title,
            author: book.author,
            reason: 'Popular book in our library collection',
            relevanceScore: 7
          })) || []
        };
      }

      // Generate AI-powered recommendations
      const recommendations = await generateBookRecommendations(userBorrowedBooks, topBooks || []);
      return { type: 'history', books: recommendations };
    } catch (error) {
      console.error('Error getting recommendations:', error);
      return { type: topic ? 'topic' : 'history', books: [] };
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = {
      id: messages.length + 1,
      text: inputMessage,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Start a chat session with conversation history
      const chat = model.startChat({
        history: messages
          .filter(msg => msg.id > 1) // Exclude the initial greeting
          .map(msg => ({
            role: msg.sender === 'user' ? 'user' : 'model',
            parts: [{ text: msg.text }]
          }))
      });

      const result = await chat.sendMessage(inputMessage);
      const response = await result.response;
      let aiResponse = response.text();

      // Check for special commands in the AI response
      if (aiResponse.includes('[BOOK_SEARCH:')) {
        const searchMatch = aiResponse.match(/\[BOOK_SEARCH:(.*?)\]/);
        if (searchMatch) {
          const searchQuery = searchMatch[1].trim();
          const searchResults = await searchBooks(searchQuery);
          
          if (searchResults.length > 0) {
            aiResponse = `I found ${searchResults.length} book(s) related to "${searchQuery}":\n\n${searchResults.map((book, index) => 
              `${index + 1}. **${book.title}** by ${book.author || 'Unknown'}\n   ${book.available ? '✅ Available' : '❌ Currently borrowed'}\n   ${book.description ? book.description.substring(0, 100) + '...' : 'No description available'}`
            ).join('\n\n')}\n\nWould you like me to help you borrow any of these books?`;
          } else {
            aiResponse = `I couldn't find any books related to "${searchQuery}" in our library. Would you like me to suggest some similar topics or help you search for something else?`;
          }
        }
      } else if (aiResponse.includes('[BOOK_SUMMARY:')) {
        const summaryMatch = aiResponse.match(/\[BOOK_SUMMARY:(.*?)\]/);
        if (summaryMatch) {
          const bookTitle = summaryMatch[1].trim();
          const summary = await generateBookSummary(bookTitle);
          aiResponse = `Here's a summary of "${bookTitle}":\n\n${summary}`;
        }
      } else if (aiResponse.includes('[BOOK_SIMILAR:')) {
        const similarMatch = aiResponse.match(/\[BOOK_SIMILAR:(.*?)\]/);
        if (similarMatch) {
          const bookTitle = similarMatch[1].trim();
          const similarBooks = await findSimilarBooks(bookTitle);
          
          if (similarBooks.length === 0) {
            aiResponse = `I'm sorry, but there are no similar books currently available to "${bookTitle}" in our library. Would you like me to search for a different topic or help you find books in a related area?`;
          } else {
            aiResponse = `Here are some books similar to "${bookTitle}" that are currently available:\n\n${similarBooks.map((book, index) => 
              `${index + 1}. **${book.title}** by ${book.author || 'Unknown'}\n   ${book.description ? book.description.substring(0, 100) + '...' : 'No description available'}`
            ).join('\n\n')}\n\nWould you like me to help you borrow any of these books?`;
          }
        }
      } else if (aiResponse.includes('[BOOK_RECOMMENDATIONS_BY_TOPIC:')) {
        const topicMatch = aiResponse.match(/\[BOOK_RECOMMENDATIONS_BY_TOPIC:(.*?)\]/);
        if (topicMatch) {
          const topic = topicMatch[1].trim();
          const recommendations = await getBookRecommendations(topic);
          
          if (recommendations.type === 'topic') {
            if (!recommendations.available || recommendations.books.length === 0) {
              aiResponse = `I'm sorry, but there are no books currently available on "${topic}" in our library. Would you like me to search for a different topic or help you find books in a related area?`;
            } else {
              aiResponse = `Here are some available books on "${topic}" that I recommend:\n\n${recommendations.books.map((book, index) => 
                `${index + 1}. **${book.title}** by ${book.author || 'Unknown'}\n   ${book.description ? book.description.substring(0, 100) + '...' : 'No description available'}`
              ).join('\n\n')}\n\nWould you like me to help you borrow any of these books?`;
            }
          }
        }
      } else if (aiResponse.includes('[BOOK_RECOMMENDATIONS]')) {
        const recommendations = await getBookRecommendations();
        
        if (recommendations.type === 'history' && recommendations.books.length > 0) {
          aiResponse = `Based on your reading history, here are some book recommendations:\n\n${recommendations.books.map((rec, index) => 
            `${index + 1}. **${rec.title}** by ${rec.author}\n   *Why you'll like it:* ${rec.reason}\n   *Relevance:* ${rec.relevanceScore}/10`
          ).join('\n\n')}\n\nWould you like me to help you borrow any of these books?`;
        } else {
          aiResponse = `I'd be happy to recommend some books! Since I don't have information about your reading preferences yet, here are some popular books from our collection. Try borrowing a few books first, and I can give you more personalized recommendations next time!`;
        }
      }

      const aiMessage = {
        id: messages.length + 2,
        text: aiResponse,
        sender: 'ai',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error sending message to Gemini:', error);
      const errorMessage = {
        id: messages.length + 2,
        text: "Sorry, I encountered an error. Please try again later.",
        sender: 'ai',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
    if (isFullscreen) {
      setIsFullscreen(false);
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <>
      {/* Floating Chat Icon */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={toggleChat}
          className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110 cursor-pointer"
          aria-label="Open AI Chat"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        </button>
      </div>

      {/* Chat Window */}
      {isOpen && (
        <div data-lenis-prevent className={`fixed bg-white rounded-lg shadow-2xl z-50 flex flex-col border border-gray-200 transition-all duration-300 ${
          isFullscreen
            ? 'inset-4 w-auto h-auto'
            : 'bottom-24 right-6 w-96 h-[500px]'
        }`}>
          {/* Chat Header */}
          <div className="bg-blue-600 text-white p-4 rounded-t-lg flex items-center justify-between">
            <div className="flex items-center space-x-2">
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
                  d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              <h3 className="font-semibold">AI Assistant</h3>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={toggleFullscreen}
                className="text-white hover:text-gray-200 transition-colors cursor-pointer"
                aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              >
                {isFullscreen ? (
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
                      d="M9 9V4.5M9 9H4.5M9 9L3.5 3.5M15 9h4.5M15 9V4.5M15 9l5.5-5.5M9 15v4.5M9 15H4.5M9 15l-5.5 5.5M15 15h4.5M15 15v4.5m0-4.5l5.5 5.5"
                    />
                  </svg>
                ) : (
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
                      d="M21 3l-6 6m0 0V4m0 5h5M3 21l6-6m0 0v5m0-5H4"
                    />
                  </svg>
                )}
              </button>
              <button
                onClick={toggleChat}
                className="text-white hover:text-gray-200 transition-colors cursor-pointer"
                aria-label="Close chat"
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className={`flex-1 overflow-y-auto p-4 space-y-4 ${
            isFullscreen ? 'bg-gray-50' : 'bg-gray-50'
          }`}>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`${
                    isFullscreen ? 'max-w-4xl' : 'max-w-xs lg:max-w-md'
                  } px-4 py-3 rounded-lg shadow-sm ${
                    message.sender === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-800 border border-gray-200'
                  }`}
                >
                  {message.sender === 'ai' ? (
                    <div className="prose prose-sm max-w-none">
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                          ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                          strong: ({ children }) => <strong className="font-semibold text-blue-700">{children}</strong>,
                          code: ({ children }) => <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">{children}</code>,
                          pre: ({ children }) => <pre className="bg-gray-100 p-3 rounded-md overflow-x-auto text-sm">{children}</pre>,
                          h1: ({ children }) => <h1 className="text-lg font-bold mb-2 text-blue-800">{children}</h1>,
                          h2: ({ children }) => <h2 className="text-base font-bold mb-2 text-blue-800">{children}</h2>,
                          h3: ({ children }) => <h3 className="text-sm font-bold mb-1 text-blue-800">{children}</h3>,
                        }}
                      >
                        {message.text}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                  )}
                  <p className={`text-xs mt-2 ${
                    message.sender === 'user' ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    {message.timestamp.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 px-4 py-2 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                    <span className="text-sm text-gray-500">AI is typing...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className={`border-t border-gray-200 bg-white rounded-b-lg ${
            isFullscreen ? 'p-6' : 'p-4'
          }`}>
            <div className="flex space-x-3">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                className={`flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                  isFullscreen ? 'text-base' : 'text-sm'
                }`}
                disabled={isLoading}
              />
              <button
                onClick={sendMessage}
                disabled={!inputMessage.trim() || isLoading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-5 py-3 rounded-lg transition-all duration-200 disabled:cursor-not-allowed cursor-pointer hover:shadow-md disabled:hover:shadow-none"
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
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AIChatbot;