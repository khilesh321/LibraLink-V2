import { useState, useRef, useEffect } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import ReactMarkdown from 'react-markdown';
import { Link } from 'react-router-dom';
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
  const [streamingMessageId, setStreamingMessageId] = useState(null);
  const messagesEndRef = useRef(null);

  const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ 
    model: 'gemini-2.5-pro',
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
6. BOOK DETAILS: When users ask for details about a specific book or want to borrow/view a book, respond with: [BOOK_DETAILS:book_title_or_id] where you can use either the book title or the book UUID. The system will handle finding the correct book.
7. RESOURCE SEARCH: When users ask to "find resources about [topic]" or "search for [resource name]" or "find PDFs about [topic]", respond with: [RESOURCE_SEARCH:topic]
8. RESOURCE SUMMARY: When users ask to "summarize [resource title]" or "give me a summary of [resource]", respond with: [RESOURCE_SUMMARY:resource_title]
9. RESOURCE RECOMMENDATIONS: When users ask for "resource recommendations" or "suggest resources" without a specific topic, respond with: [RESOURCE_RECOMMENDATIONS]
10. RESOURCE TOPIC RECOMMENDATIONS: When users ask for "recommend resources on [topic]" or "suggest resources about [subject]", respond with: [RESOURCE_RECOMMENDATIONS_BY_TOPIC:topic]
11. SIMILAR RESOURCES: When users ask for "resources similar to [resource title]" or "recommend similar resources", respond with: [RESOURCE_SIMILAR:resource_title]
12. RESOURCE DETAILS: When users ask for details about a specific resource or want to read/view a resource, respond with: [RESOURCE_DETAILS:resource_title_or_id] where you can use either the resource title or the resource UUID. The system will handle finding the correct resource.

LIBRARY PROCESSES AND INSTRUCTIONS:
When users ask about borrowing books:
- Explain that borrowing is done through QR code scanning
- Books can be borrowed instantly with automated tracking
- Users can view their borrowed books and due dates in "My Transactions"
- Mention that real-time availability is shown

When users ask about renewing books:
- Renewal can be done with one click from the book details modal
- Users can renew a book up to 2 times
- After 2 renewals, the book must be returned
- Due dates are automatically extended upon renewal

When users ask about returning books:
- Books are returned through the library system
- Users will be prompted to rate the book after returning
- Returned books become available for other users immediately

When users ask about reading books:
- For physical books: Users must borrow the book first, then can read it during the borrowing period
- For digital resources (PDFs): Available in the Resources section with options to "Read Online" or "Read as Flipbook" for interactive experience
- Digital resources can be accessed without borrowing

Always be friendly, helpful, and knowledgeable about library operations. Remember user information and preferences throughout the conversation to provide personalized assistance. If you don't know something specific about the library's current inventory or policies, acknowledge this and suggest asking a librarian for the most up-to-date information.

CONTENT FILTERING RULES:
- NEVER recommend or display books/resources with titles containing words like: "test", "demo", "sample", "example", "my transactions", "admin", "system", "debug", "placeholder", "temporary", or similar internal/testing terms
- Only recommend legitimate, user-appropriate books and resources from the actual library collection
- If a search returns only filtered results, inform the user that no appropriate materials were found and suggest alternative search terms`});


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

  // Function to search resources by topic or title
  const searchResources = async (query) => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .or(`name.ilike.%${query}%,description.ilike.%${query}%,author.ilike.%${query}%,filename.ilike.%${query}%`)
        .limit(10);

      if (error) throw error;

      // Filter out inappropriate resources
      const filteredData = filterInappropriateResources(data || []);
      return filteredData;
    } catch (error) {
      console.error('Error searching resources:', error);
      return [];
    }
  };

  // Function to get resource details by ID or title
  const getResourceDetails = async (identifier) => {
    try {
      // Check if it's a UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      
      let query;
      if (uuidRegex.test(identifier)) {
        // It's an ID
        query = supabase
          .from('documents')
          .select('*')
          .eq('id', identifier)
          .single();
      } else {
        // It's a title, search for it
        query = supabase
          .from('documents')
          .select('*')
          .ilike('name', `%${identifier}%`)
          .limit(1);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error getting resource details:', error);
      return null;
    }
  };

  // Function to generate resource summary
  const generateResourceSummary = async (resourceTitle) => {
    try {
      const summaryModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      const prompt = `Generate a concise and engaging summary of the resource "${resourceTitle}". 

Please provide:
1. A brief overview (2-3 sentences) of what this resource covers
2. Main topics or subjects discussed
3. Who would benefit from reading this resource
4. Key takeaways or important concepts covered

Keep the total summary under 200 words. Make it informative and enticing for someone considering reading this resource.`;

      const result = await summaryModel.generateContent(prompt);
      const response = await result.response;
      return response.text().trim();
    } catch (error) {
      console.error('Error generating resource summary:', error);
      return 'Sorry, I couldn\'t generate a summary for this resource right now.';
    }
  };

  // Function to find similar resources using AI
  const findSimilarResources = async (resourceTitle) => {
    try {
      // First, get all resources from the database
      const { data: allResources, error } = await supabase
        .from('documents')
        .select('*')
        .limit(100); // Get more resources for better matching

      if (error) throw error;

      if (!allResources || allResources.length === 0) {
        return `I couldn't find any similar resources to "${resourceTitle}" in our library. Would you like me to search for resources on a related topic instead?`;
      }

      // Filter out inappropriate resources
      const filteredResources = filterInappropriateResources(allResources);

      if (filteredResources.length === 0) {
        return `I couldn't find any appropriate similar resources to "${resourceTitle}" in our library. Would you like me to search for resources on a related topic instead?`;
      }

      // Use AI to find semantically similar resources
      const similarResourcesModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      
      const resourcesText = filteredResources
        .slice(0, 50) // Limit to 50 resources for the prompt
        .map(resource => 
          `"${resource.name}" by ${resource.author || 'Unknown'}: ${resource.description || 'No description'}`
        )
        .join('\n');

      const prompt = `Given the resource "${resourceTitle}", find the 5 most similar resources from this list based on themes, topics, subject matter, or content type. Consider resources that would appeal to readers of "${resourceTitle}".

Resources in our library:
${resourcesText}

Return only a JSON array of the most similar resource titles (exactly as they appear in the list above). Return at most 5 resources. If no similar resources are found, return an empty array.

Example response: ["Resource Title 1", "Resource Title 2", "Resource Title 3"]`;

      const result = await similarResourcesModel.generateContent(prompt);
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
        // Fallback: try to extract resource titles from the text
        const titleMatches = text.match(/"([^"]+)"/g);
        similarTitles = titleMatches ? titleMatches.map(match => match.slice(1, -1)) : [];
      }

      // Find the actual resource objects
      const similarResources = similarTitles
        .map(title => filteredResources.find(resource => resource.name === title))
        .filter(Boolean)
        .slice(0, 5);

      if (similarResources.length === 0) {
        return `I couldn't find any similar resources to "${resourceTitle}" in our library. Would you like me to search for resources on a related topic instead?`;
      }

      return `Here are some resources similar to "${resourceTitle}" that are currently available:\n\n${similarResources.map((resource, index) =>
        `${index + 1}. **[${resource.name}](/resource/${resource.id})** by ${resource.author || 'Unknown'}\n   ${resource.description ? resource.description.substring(0, 100) + '...' : 'No description available'}`
      ).join('\n\n')}\n\nWould you like me to help you access any of these resources?`;
    } catch (error) {
      console.error('Error finding similar resources:', error);
      return [];
    }
  };

  // Function to filter out inappropriate resources
  const filterInappropriateResources = (resources) => {
    const inappropriateKeywords = [
      'test', 'demo', 'sample', 'example', 'my transactions', 
      'admin', 'system', 'debug', 'placeholder', 'temporary',
      'flipbook demo', 'mytransactions'
    ];
    
    return resources.filter(resource => {
      const title = resource.name?.toLowerCase() || '';
      return !inappropriateKeywords.some(keyword => 
        title.includes(keyword.toLowerCase())
      );
    });
  };

  // Function to get resource recommendations
  const getResourceRecommendations = async (topic = null) => {
    try {
      if (topic) {
        // Topic-based recommendations
        const searchResults = await searchResources(topic);
        
        // Filter out inappropriate resources
        const filteredResults = filterInappropriateResources(searchResults);
        
        if (filteredResults.length === 0) {
          return { type: 'topic', available: false, resources: [] };
        }

        return { 
          type: 'topic', 
          available: filteredResults.length > 0, 
          resources: filteredResults.slice(0, 5),
          topic: topic
        };
      }

      // General recommendations - get popular resources
      const { data: topResources, error } = await supabase
        .from('documents')
        .select('*')
        .limit(10);

      if (error) throw error;

      // Filter out inappropriate resources
      const filteredResources = filterInappropriateResources(topResources || []);

      return { 
        type: 'general', 
        resources: filteredResources.slice(0, 5).map(resource => ({
          id: resource.id,
          name: resource.name,
          author: resource.author,
          description: resource.description,
          reason: 'Popular resource in our library collection',
          relevanceScore: 7
        })) || []
      };
    } catch (error) {
      console.error('Error getting resource recommendations:', error);
      return { type: topic ? 'topic' : 'general', resources: [] };
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

    // Create a placeholder AI message for streaming
    const aiMessageId = messages.length + 2;
    const aiMessage = {
      id: aiMessageId,
      text: '',
      sender: 'ai',
      timestamp: new Date(),
      isStreaming: true
    };

    setMessages(prev => [...prev, aiMessage]);
    setStreamingMessageId(aiMessageId);

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

      // Use streaming API
      const result = await chat.sendMessageStream(inputMessage);
      let accumulatedText = '';

      // Process the stream
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        accumulatedText += chunkText;

        // Update the streaming message
        setMessages(prev => prev.map(msg =>
          msg.id === aiMessageId
            ? { ...msg, text: accumulatedText }
            : msg
        ));
      }

      // Process special commands after streaming is complete
      let finalResponse = accumulatedText;

      // Check for special commands in the AI response
      if (finalResponse.includes('[BOOK_SEARCH:')) {
        const searchMatch = finalResponse.match(/\[BOOK_SEARCH:(.*?)\]/);
        if (searchMatch) {
          const searchQuery = searchMatch[1].trim();
          const searchResults = await searchBooks(searchQuery);

          if (searchResults.length > 0) {
            finalResponse = `I found ${searchResults.length} book(s) related to "${searchQuery}":\n\n${searchResults.map((book, index) =>
              `${index + 1}. **[${book.title}](/book/${book.id})** by ${book.author || 'Unknown'}\n   ${book.available ? '✅ Available' : '❌ Currently borrowed'}\n   ${book.description ? book.description.substring(0, 100) + '...' : 'No description available'}`
            ).join('\n\n')}\n\nWould you like me to help you borrow any of these books?`;
          } else {
            finalResponse = `I couldn't find any books related to "${searchQuery}" in our library. Would you like me to suggest some similar topics or help you search for something else?`;
          }
        }
      } else if (finalResponse.includes('[BOOK_SUMMARY:')) {
        const summaryMatch = finalResponse.match(/\[BOOK_SUMMARY:(.*?)\]/);
        if (summaryMatch) {
          const bookTitle = summaryMatch[1].trim();
          const summary = await generateBookSummary(bookTitle);
          finalResponse = `Here's a summary of "${bookTitle}":\n\n${summary}`;
        }
      } else if (finalResponse.includes('[BOOK_SIMILAR:')) {
        const similarMatch = finalResponse.match(/\[BOOK_SIMILAR:(.*?)\]/);
        if (similarMatch) {
          const bookTitle = similarMatch[1].trim();
          const similarBooks = await findSimilarBooks(bookTitle);

          if (similarBooks.length === 0) {
            finalResponse = `I'm sorry, but there are no similar books currently available to "${bookTitle}" in our library. Would you like me to search for a different topic or help you find books in a related area?`;
          } else {
            finalResponse = `Here are some books similar to "${bookTitle}" that are currently available:\n\n${similarBooks.map((book, index) =>
              `${index + 1}. **[${book.title}](/book/${book.id})** by ${book.author || 'Unknown'}\n   ${book.description ? book.description.substring(0, 100) + '...' : 'No description available'}`
            ).join('\n\n')}\n\nWould you like me to help you borrow any of these books?`;
          }
        }
      } else if (finalResponse.includes('[BOOK_RECOMMENDATIONS_BY_TOPIC:')) {
        const topicMatch = finalResponse.match(/\[BOOK_RECOMMENDATIONS_BY_TOPIC:(.*?)\]/);
        if (topicMatch) {
          const topic = topicMatch[1].trim();
          const recommendations = await getBookRecommendations(topic);

          if (recommendations.type === 'topic') {
            if (!recommendations.available || recommendations.books.length === 0) {
              finalResponse = `I'm sorry, but there are no books currently available on "${topic}" in our library. Would you like me to search for a different topic or help you find books in a related area?`;
            } else {
              finalResponse = `Here are some available books on "${topic}" that I recommend:\n\n${recommendations.books.map((book, index) =>
                `${index + 1}. **[${book.title}](/book/${book.id})** by ${book.author || 'Unknown'}\n   ${book.description ? book.description.substring(0, 100) + '...' : 'No description available'}`
              ).join('\n\n')}\n\nWould you like me to help you borrow any of these books?`;
            }
          }
        }
      } else if (finalResponse.includes('[BOOK_RECOMMENDATIONS]')) {
        const recommendations = await getBookRecommendations();

        if (recommendations.type === 'history' && recommendations.books.length > 0) {
          finalResponse = `Based on your reading history, here are some book recommendations:\n\n${recommendations.books.map((rec, index) =>
            `${index + 1}. **${rec.title}** by ${rec.author}\n   *Why you'll like it:* ${rec.reason}\n   *Relevance:* ${rec.relevanceScore}/10`
          ).join('\n\n')}\n\nWould you like me to help you borrow any of these books?`;
        } else {
          finalResponse = `I'd be happy to recommend some books! Since I don't have information about your reading preferences yet, here are some popular books from our collection. Try borrowing a few books first, and I can give you more personalized recommendations next time!`;
        }
      } else if (finalResponse.includes('[BOOK_DETAILS:')) {
        const detailsMatch = finalResponse.match(/\[BOOK_DETAILS:(.*?)\]/);
        if (detailsMatch) {
          const bookIdentifier = detailsMatch[1].trim();
          
          // Check if it's a UUID (book ID) or a title
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          let bookId = bookIdentifier;
          
          if (!uuidRegex.test(bookIdentifier)) {
            // It's a title, search for the book
            try {
              const { data: books, error } = await supabase
                .from('books')
                .select('id, title, author')
                .ilike('title', `%${bookIdentifier}%`)
                .limit(1);
              
              if (!error && books && books.length > 0) {
                bookId = books[0].id;
                finalResponse = `Here's the details for "${books[0].title}" by ${books[0].author || 'Unknown'}. [View Book Details](/book/${bookId})`;
              } else {
                finalResponse = `I couldn't find a book with that title. Try searching for books with a similar topic instead.`;
              }
            } catch (error) {
              console.error('Error searching for book:', error);
              finalResponse = `I couldn't find details for that book. Please try a different search.`;
            }
          } else {
            // It's a book ID, fetch details
            try {
              const { data: book, error } = await supabase
                .from('books')
                .select('title, author')
                .eq('id', bookId)
                .single();

              if (!error && book) {
                finalResponse = `Here's the details for "${book.title}" by ${book.author || 'Unknown'}. [View Book Details](/book/${bookId})`;
              } else {
                finalResponse = `I found the book you're looking for. [View Book Details](/book/${bookId})`;
              }
            } catch (error) {
              console.error('Error fetching book details:', error);
              finalResponse = `Click here to view the book details: [View Book Details](/book/${bookId})`;
            }
          }
        }
      } else if (finalResponse.includes('[RESOURCE_SEARCH:')) {
        const resourceSearchMatch = finalResponse.match(/\[RESOURCE_SEARCH:(.*?)\]/);
        if (resourceSearchMatch) {
          const topic = resourceSearchMatch[1].trim();
          const resourceResults = await searchResources(topic);

          if (resourceResults.length === 0) {
            finalResponse = `I'm sorry, but there are no resources currently available on "${topic}" in our library. Would you like me to search for a different topic or help you find resources in a related area?`;
          } else {
            finalResponse = `Here are some available resources on "${topic}":\n\n${resourceResults.map((resource, index) =>
              `${index + 1}. **[${resource.name}](/resource/${resource.id})** by ${resource.author || 'Unknown'}\n   ${resource.description ? resource.description.substring(0, 100) + '...' : 'No description available'}`
            ).join('\n\n')}\n\nWould you like me to help you access any of these resources?`;
          }
        }
      } else if (finalResponse.includes('[RESOURCE_DETAILS:')) {
        const resourceDetailsMatch = finalResponse.match(/\[RESOURCE_DETAILS:(.*?)\]/);
        if (resourceDetailsMatch) {
          const resourceIdentifier = resourceDetailsMatch[1].trim();
          
          // Check if it's a UUID (resource ID) or a title
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          let resourceId = resourceIdentifier;
          
          if (!uuidRegex.test(resourceIdentifier)) {
            // It's a title, search for the resource
            try {
              const { data: resources, error } = await supabase
                .from('documents')
                .select('id, name, author')
                .ilike('name', `%${resourceIdentifier}%`)
                .limit(1);
              
              if (!error && resources && resources.length > 0) {
                resourceId = resources[0].id;
                finalResponse = `Here's the details for "${resources[0].name}" by ${resources[0].author || 'Unknown'}. [View Resource Details](/resource/${resourceId})`;
              } else {
                finalResponse = `I couldn't find a resource with that title. Try searching for resources with a similar topic instead.`;
              }
            } catch (error) {
              console.error('Error searching for resource:', error);
              finalResponse = `I couldn't find details for that resource. Please try a different search.`;
            }
          } else {
            // It's a resource ID, fetch details
            try {
              const { data: resource, error } = await supabase
                .from('documents')
                .select('name, author')
                .eq('id', resourceId)
                .single();

              if (!error && resource) {
                finalResponse = `Here's the details for "${resource.name}" by ${resource.author || 'Unknown'}. [View Resource Details](/resource/${resourceId})`;
              } else {
                finalResponse = `I found the resource you're looking for. [View Resource Details](/resource/${resourceId})`;
              }
            } catch (error) {
              console.error('Error fetching resource details:', error);
              finalResponse = `Click here to view the resource details: [View Resource Details](/resource/${resourceId})`;
            }
          }
        }
      } else if (finalResponse.includes('[RESOURCE_SUMMARY:')) {
        const resourceSummaryMatch = finalResponse.match(/\[RESOURCE_SUMMARY:(.*?)\]/);
        if (resourceSummaryMatch) {
          const resourceIdentifier = resourceSummaryMatch[1].trim();
          const summary = await generateResourceSummary(resourceIdentifier);
          finalResponse = summary;
        }
      } else if (finalResponse.includes('[RESOURCE_RECOMMENDATIONS_BY_TOPIC:')) {
        const topicMatch = finalResponse.match(/\[RESOURCE_RECOMMENDATIONS_BY_TOPIC:(.*?)\]/);
        if (topicMatch) {
          const topic = topicMatch[1].trim();
          const recommendations = await getResourceRecommendations(topic);

          if (recommendations.type === 'topic') {
            if (!recommendations.available || recommendations.resources.length === 0) {
              finalResponse = `I'm sorry, but there are no resources currently available on "${topic}" in our library. Would you like me to search for a different topic or help you find resources in a related area?`;
            } else {
              finalResponse = `Here are some available resources on "${topic}" that I recommend:\n\n${recommendations.resources.map((resource, index) =>
                `${index + 1}. **[${resource.name}](/resource/${resource.id})** by ${resource.author || 'Unknown'}\n   ${resource.description ? resource.description.substring(0, 100) + '...' : 'No description available'}`
              ).join('\n\n')}\n\nWould you like me to help you access any of these resources?`;
            }
          }
        }
      } else if (finalResponse.includes('[RESOURCE_RECOMMENDATIONS]')) {
        const recommendations = await getResourceRecommendations();

        if (recommendations.type === 'general' && recommendations.resources.length > 0) {
          finalResponse = `Here are some recommended resources from our library collection:\n\n${recommendations.resources.map((rec, index) =>
            `${index + 1}. **[${rec.name}](/resource/${rec.id})** by ${rec.author || 'Unknown'}\n   *Why you'll like it:* ${rec.reason}\n   *Relevance:* ${rec.relevanceScore}/10`
          ).join('\n\n')}\n\nWould you like me to help you access any of these resources?`;
        } else {
          finalResponse = `I'd be happy to recommend some resources! Here are some popular resources from our collection. Try accessing a few resources first, and I can give you more personalized recommendations next time!`;
        }
      } else if (finalResponse.includes('[RESOURCE_SIMILAR:')) {
        const similarMatch = finalResponse.match(/\[RESOURCE_SIMILAR:(.*?)\]/);
        if (similarMatch) {
          const resourceTitle = similarMatch[1].trim();
          const similarResources = await findSimilarResources(resourceTitle);
          finalResponse = similarResources;
        }
      }
      setMessages(prev => prev.map(msg =>
        msg.id === aiMessageId
          ? { ...msg, text: finalResponse, isStreaming: false }
          : msg
      ));

    } catch (error) {
      console.error('Error sending message to Gemini:', error);
      const errorMessage = {
        id: messages.length + 2,
        text: "Sorry, I encountered an error. Please try again later.",
        sender: 'ai',
        timestamp: new Date()
      };
      setMessages(prev => prev.map(msg =>
        msg.id === aiMessageId
          ? errorMessage
          : msg
      ));
    } finally {
      setIsLoading(false);
      setStreamingMessageId(null);
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
      <div className="fixed bottom-4 right-4 z-50 md:bottom-5 md:right-6">
        <div className="relative group">
          {/* Tooltip */}
          <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap shadow-lg">
            Chat with AI Assistant
            <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
          </div>

          {/* Ripple effect background */}
          <div className="absolute inset-0 rounded-full bg-linear-to-r from-blue-400 to-purple-500 animate-ping opacity-20"></div>

          <button
            onClick={toggleChat}
            className={`relative bg-linear-to-r from-blue-500 via-purple-600 to-blue-700 hover:from-blue-600 hover:via-purple-700 hover:to-blue-800 text-white p-4 md:p-5 rounded-full shadow-2xl hover:shadow-blue-500/25 transition-all duration-500 transform cursor-pointer overflow-hidden group/btn ${
              isOpen ? '' : 'hover:shadow-purple-500/30'
            }`}
            aria-label="Open AI Chat Assistant"
          >
            {/* Animated background gradient */}
            <div className="absolute inset-0 bg-linear-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:btn:translate-x-[100%] transition-transform duration-1000"></div>

            {/* Glowing border effect */}
            <div className="absolute inset-0 rounded-full bg-linear-to-r from-blue-400 to-purple-500 opacity-0 group-hover/btn:opacity-50 blur-sm transition-opacity duration-300"></div>

            {/* Main icon with enhanced animation */}
            <div className="relative z-10">
              <svg
                className={`w-6 h-6 transition-transform duration-300 ${
                  isOpen ? 'rotate-180' : 'rotate-0'
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>

            {/* Floating particles effect */}
            <div className="absolute inset-0 rounded-full overflow-hidden">
              <div className="absolute top-1 left-1 w-1 h-1 bg-white/60 rounded-full animate-bounce opacity-0 group-hover/btn:opacity-100 animation-delay-100"></div>
              <div className="absolute top-2 right-2 w-0.5 h-0.5 bg-white/40 rounded-full animate-ping opacity-0 group-hover/btn:opacity-100 animation-delay-300"></div>
              <div className="absolute bottom-1 left-2 w-0.5 h-0.5 bg-white/50 rounded-full animate-pulse opacity-0 group-hover/btn:opacity-100 animation-delay-500"></div>
            </div>
          </button>
        </div>
      </div>

      {/* Chat Window */}
      {isOpen && (
        <div data-lenis-prevent className={`fixed bg-white rounded-2xl shadow-2xl z-50 flex flex-col border border-gray-200/50 backdrop-blur-sm transition-all duration-500 ease-out transform ${
          isFullscreen
            ? 'inset-4 w-auto h-auto scale-100 opacity-100'
            : 'bottom-16 right-4 left-4 md:bottom-24 md:right-6 md:left-auto w-auto md:w-96 h-[400px] md:h-[500px] scale-100 opacity-100'
        } ${isOpen ? 'animate-in slide-in-from-bottom-4 fade-in duration-300' : 'animate-out slide-out-to-bottom-4 fade-out duration-200'}`}>
          {/* Chat Header */}
          <div className="bg-linear-to-r from-blue-600 via-purple-600 to-blue-700 text-white p-3 md:p-4 rounded-t-2xl flex items-center justify-between relative overflow-hidden">
            <div className="absolute inset-0 bg-linear-to-r from-white/10 to-transparent"></div>
            <div className="flex items-center space-x-2 md:space-x-3 relative z-10">
              <div className="w-6 h-6 md:w-8 md:h-8 bg-white/20 rounded-full flex items-center justify-center">
                <svg
                  className="w-4 h-4 md:w-5 md:h-5"
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
              </div>
              <div>
                <h3 className="font-semibold text-sm md:text-sm">LibraLink AI Assistant</h3>
                <p className="text-xs text-blue-100 opacity-90">Online • Ready to help</p>
              </div>
            </div>
            <div className="flex items-center space-x-1 relative z-10">
              <button
                onClick={toggleFullscreen}
                className="text-white/80 hover:text-white hover:bg-white/10 p-2 md:p-2 rounded-lg transition-all duration-200 cursor-pointer min-w-11 min-h-11 md:min-w-0 md:min-h-0 flex items-center justify-center"
                aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              >
                {isFullscreen ? (
                  <svg
                    className="w-4 h-4 md:w-4 md:h-4"
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
                    className="w-4 h-4 md:w-4 md:h-4"
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
                className="text-white/80 hover:text-white hover:bg-white/10 p-2 md:p-2 rounded-lg transition-all duration-200 cursor-pointer min-w-11 min-h-11 md:min-w-0 md:min-h-0 flex items-center justify-center"
                aria-label="Close chat"
              >
                <svg
                  className="w-4 h-4 md:w-4 md:h-4"
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
          <div className={`flex-1 overflow-y-auto p-3 md:p-4 space-y-3 md:space-y-4 bg-linear-to-b from-gray-50 to-white ${
            isFullscreen ? 'bg-gray-50' : 'bg-gray-50'
          }`}>
            {messages.map((message, index) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 fade-in duration-300`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div
                  className={`${
                    isFullscreen ? 'max-w-4xl' : 'max-w-[calc(100vw-3rem)] sm:max-w-xs md:max-w-md'
                  } px-3 py-2 md:px-4 md:py-3 rounded-2xl shadow-sm relative group transition-all duration-200 hover:shadow-md ${
                    message.sender === 'user'
                      ? 'bg-linear-to-r from-blue-500 to-purple-600 text-white rounded-br-md'
                      : 'bg-white text-gray-800 border border-gray-100 rounded-bl-md'
                  }`}
                >
                  {message.sender === 'ai' ? (
                    <div className="prose prose-sm max-w-none">
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
                          ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1 text-gray-700">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1 text-gray-700">{children}</ol>,
                          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                          strong: ({ children }) => <strong className="font-semibold text-blue-700">{children}</strong>,
                          code: ({ children }) => <code className="bg-blue-50 text-blue-800 px-2 py-1 rounded-md text-sm font-mono border">{children}</code>,
                          pre: ({ children }) => <pre className="bg-gray-100 p-3 rounded-lg overflow-x-auto text-sm border">{children}</pre>,
                          h1: ({ children }) => <h1 className="text-lg font-bold mb-2 text-blue-800 border-b border-blue-200 pb-1">{children}</h1>,
                          h2: ({ children }) => <h2 className="text-base font-bold mb-2 text-blue-800">{children}</h2>,
                          h3: ({ children }) => <h3 className="text-sm font-bold mb-1 text-blue-800">{children}</h3>,
                          a: ({ href, children }) => {
                            // Check if it's an internal link (starts with /)
                            if (href && href.startsWith('/')) {
                              return <Link to={href} onClick={() => {
                                if (isFullscreen) {
                                  setIsFullscreen(false);
                                } else {
                                  setIsOpen(false);
                                }
                              }} className="text-blue-600 hover:text-blue-800 underline font-medium">{children}</Link>;
                            }
                            // External links
                            return <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline font-medium">{children}</a>;
                          },
                        }}
                      >
                        {message.text}
                      </ReactMarkdown>
                      {message.isStreaming && (
                        <span className="inline-block w-2 h-4 bg-blue-500 ml-1 animate-pulse"></span>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.text}</p>
                  )}
                  <p className={`text-xs mt-2 opacity-70 ${
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
            {isLoading && !streamingMessageId && (
              <div className="flex justify-start animate-in slide-in-from-bottom-2 fade-in duration-300">
                <div className="bg-white border border-gray-100 px-4 py-3 rounded-2xl rounded-bl-md shadow-sm">
                  <div className="flex items-center space-x-3">
                    <div className="flex space-x-1">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                    <span className="text-sm text-gray-600 font-medium">AI is thinking...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className={`border-t border-gray-200/50 bg-white/80 backdrop-blur-sm rounded-b-2xl ${
            isFullscreen ? 'p-4 md:p-6' : 'p-3 md:p-4'
          }`}>
            <div className="flex space-x-2 md:space-x-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me anything about the library..."
                  className={`w-full px-3 py-2 md:px-4 md:py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400 transition-all duration-200 bg-white/50 backdrop-blur-sm ${
                    isFullscreen ? 'text-base' : 'text-sm md:text-base'
                  } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={isLoading}
                />
                {inputMessage && (
                  <button
                    onClick={() => setInputMessage('')}
                    className="absolute right-2 md:right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200 p-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              <button
                onClick={sendMessage}
                disabled={!inputMessage.trim() || isLoading}
                className={`bg-linear-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-400 text-white px-3 py-2 md:px-5 md:py-3 rounded-xl transition-all duration-200 disabled:cursor-not-allowed cursor-pointer hover:shadow-lg disabled:hover:shadow-none transform hover:scale-105 disabled:hover:scale-100 min-w-11 min-h-11 md:min-w-0 md:min-h-0 ${
                  isLoading ? 'animate-pulse' : ''
                }`}
              >
                {isLoading ? (
                  <div className="w-4 h-4 md:w-5 md:h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <svg
                    className="w-4 h-4 md:w-5 md:h-5"
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
                )}
              </button>
            </div>
            <div className="mt-2 text-xs text-gray-500 text-center">
              Press Enter to send • Type your library questions
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// Custom styles for enhanced animations
const styles = `
  @keyframes messageSlideIn {
    from {
      opacity: 0;
      transform: translateY(20px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @keyframes chatWindowSlideIn {
    from {
      opacity: 0;
      transform: translateY(20px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @keyframes typingDots {
    0%, 80%, 100% {
      transform: scale(0.8);
      opacity: 0.5;
    }
    40% {
      transform: scale(1);
      opacity: 1;
    }
  }

  .animate-message-in {
    animation: messageSlideIn 0.3s ease-out forwards;
  }

  .animate-chat-in {
    animation: chatWindowSlideIn 0.4s ease-out forwards;
  }

  .typing-dot {
    animation: typingDots 1.4s infinite ease-in-out;
  }

  .typing-dot:nth-child(2) {
    animation-delay: 0.2s;
  }

  .typing-dot:nth-child(3) {
    animation-delay: 0.4s;
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}

export default AIChatbot;