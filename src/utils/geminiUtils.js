import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

// ============================================================================
// UNIFIED LLM CLIENT CONFIGURATION
// ============================================================================

/**
 * Configuration for all supported AI providers
 */
export const LLM_PROVIDERS = {
  A4F: {
    baseUrl: 'https://api.a4f.co/v1',
    apiKey: () => import.meta.env.VITE_A4F_API_KEY,
    models: {
      GROK_4: 'provider-5/grok-4-0709',
      LLAMA_3_2: 'provider-6/llama-3.2-3b-instruct',
      GPT_4O_MINI: 'provider-7/gpt-4o-mini',
      CLAUDE_3_5_SONNET: 'provider-8/claude-3-5-sonnet-20241022',
    },
  },
  GEMINI: {
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    apiKey: () => import.meta.env.VITE_GEMINI_API_KEY,
    models: {
      PRO_2_5: 'gemini-2.5-pro',
      FLASH_2_5: 'gemini-2.5-flash',
      FLASH_LITE_2_5: 'gemini-2.5-flash-lite',
      FLASH_2_0: 'gemini-2.0-flash',
    },
  },
  GROQ: {
    baseUrl: 'https://api.groq.com/openai/v1',
    apiKey: () => import.meta.env.VITE_GROQ_API_KEY,
    models: {
      LLAMA_3_1_70B: 'llama-3.1-70b-versatile',
      LLAMA_3_1_8B: 'llama-3.1-8b-instant',
      MIXTRAL_8x7B: 'mixtral-8x7b-32768',
      KIMI_K2: 'moonshotai/kimi-k2-instruct-0905',
      GROQ_COMPOUND: 'groq/compound',
      LLAMA_4_MAVERICK: 'meta-llama/llama-4-maverick-17b-128e-instruct',
      GPT_OSS_120B: 'openai/gpt-oss-120b',
      GPT_OSS_20B: 'openai/gpt-oss-20b',
    },
  },
  OPENROUTER: {
    baseUrl: 'https://openrouter.ai/api/v1',
    apiKey: () => import.meta.env.VITE_OPENROUTER_API_KEY,
    models: {
      GPT_4O: 'openai/gpt-4o',
      GPT_4O_MINI: 'openai/gpt-4o-mini',
      GPT_4_TURBO: 'openai/gpt-4-turbo',
      GPT_3_5_TURBO: 'openai/gpt-3.5-turbo',
      CLAUDE_3_5_SONNET: 'anthropic/claude-3.5-sonnet',
      CLAUDE_3_OPUS: 'anthropic/claude-3-opus',
      CLAUDE_3_HAIKU: 'anthropic/claude-3-haiku',
      GEMINI_PRO: 'google/gemini-pro',
      GEMINI_2_5_FLASH: 'google/gemini-2.5-flash',
      GEMINI_2_5_PRO: 'google/gemini-2.5-pro',
      GROK_1: 'xai/grok-1',
      LLAMA_3_1_70B: 'meta-llama/llama-3.1-70b-instruct',
      LLAMA_3_1_8B: 'meta-llama/llama-3.1-8b-instruct',
      LLAMA_3_1_405B: 'meta-llama/llama-3.1-405b-instruct',
      MISTRAL_LARGE: 'mistralai/mistral-large',
      MISTRAL_NEMO: 'mistralai/mistral-nemo',
      MIXTRAL_8x7B: 'mistralai/mixtral-8x7b-instruct',
      MIXTRAL_8x22B: 'mistralai/mixtral-8x22b-instruct',
      PHI_3_MEDIUM: 'microsoft/phi-3-medium-128k-instruct',
      PHI_3_MINI: 'microsoft/phi-3-mini-128k-instruct',
      WIZARDLM_2_8x22B: 'microsoft/wizardlm-2-8x22b',
      HERMES_2_PRO: 'nousresearch/hermes-2-pro-llama-3-8b',
      GEMMA_2_9B: 'google/gemma-2-9b-it',
      GEMMA_2_27B: 'google/gemma-2-27b-it',
      DEEPSEEK_V3_1: 'deepseek/deepseek-v3.1',
      QWEN2_5_CODER_32B: 'qwen/qwen2.5-coder-32b-instruct',
      CODESTRAL_2501: 'mistralai/codestral-2501',
      NOROMAID_20B: 'neversleep/noromaid-20b',
      MYTHOMAX_13B: 'gryphe/mythomax-l2-13b',
      GOLIATH_120B: 'alpindale/goliath-120b',
      AUTO_ROUTER: 'openrouter/auto',
    },
  },
  LLM7: {
    baseUrl: 'https://api.llm7.io/v1',
    apiKey: () => import.meta.env.VITE_LLM7_API_KEY,
    models: {
      CLAUDYCLAUDE: 'claudyclaude',
      DEEPSEEK_V3_1: 'deepseek-v3.1',
      GEMINI_2_5_FLASH_LITE: 'gemini-2.5-flash-lite',
      GEMINI_SEARCH: 'gemini-search',
      MISTRAL_SMALL_3_1_24B: 'mistral-small-3.1-24b-instruct-2503',
      GPT_5_MINI: 'gpt-5-mini',
      GPT_5_NANO: 'gpt-5-nano-2025-08-07',
      GPT_5_CHAT: 'gpt-5-chat',
      GPT_O4_MINI: 'gpt-o4-mini-2025-04-16',
      QWEN2_5_CODER_32B: 'qwen2.5-coder-32b-instruct',
      ROBLOX_RP: 'roblox-rp',
      BIDARA: 'bidara',
      RTIST: 'rtist',
      CODESTRAL_2405: 'codestral-2405',
      CODESTRAL_2501: 'codestral-2501',
      GLM_4_5_FLASH: 'glm-4.5-flash',
    },
  },
};

/**
 * Unified LLM client for OpenAI-compatible APIs (Gemini, A4F, Groq, OpenRouter, etc.)
 *
 * @param {Object} config - Configuration object
 * @param {string} config.prompt - The prompt/user message to send
 * @param {string} config.model - The model name (e.g., 'gpt-4', 'gemini-2.5-flash', 'grok-4')
 * @param {string} config.apiKey - API key for authentication
 * @param {string} config.baseUrl - Base URL for the API endpoint
 * @param {Object} config.options - Optional generation parameters
 * @param {number} config.options.temperature - Temperature (0-2, default: 0.7)
 * @param {number} config.options.maxTokens - Max tokens to generate (default: 2048)
 * @param {string} config.options.responseFormat - Response format ('text' or 'json', default: 'text')
 * @param {Array} config.messages - Optional: Custom messages array (overrides prompt)
 * @param {string} config.systemPrompt - Optional: System prompt/instructions
 * @param {Function} config.onStream - Optional: Callback for streaming responses (chunk) => void
 * @returns {Promise<string>} - The LLM response text
 *
 * @example
 * // Using with A4F
 * const response = await llmClient({
 *   prompt: "Explain quantum computing",
 *   model: "provider-5/grok-4-0709",
 *   apiKey: import.meta.env.VITE_A4F_API_KEY,
 *   baseUrl: "https://api.a4f.co/v1"
 * });
 *
 * @example
 * // Using with Gemini via OpenAI-compatible endpoint
 * const response = await llmClient({
 *   prompt: "Write a poem",
 *   model: "gemini-2.5-flash",
 *   apiKey: import.meta.env.VITE_GEMINI_API_KEY,
 *   baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai"
 * });
 *
 * @example
 * // Using with streaming
 * let fullResponse = '';
 * const response = await llmClient({
 *   prompt: "Write a story",
 *   model: "gemini-2.5-flash",
 *   apiKey: import.meta.env.VITE_GEMINI_API_KEY,
 *   baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
 *   onStream: (chunk) => {
 *     fullResponse += chunk;
 *     console.log('Received chunk:', chunk);
 *   }
 * });
 */
export const llmClient = async ({
  prompt,
  model,
  apiKey,
  baseUrl,
  options = {},
  messages = null,
  systemPrompt = null,
  onStream = null,
}) => {
  // Check if this is a Gemini request (Google's API) - declare outside try block for catch access
  const isGeminiRequest = baseUrl.includes('generativelanguage.googleapis.com');

  try {
    // Validate required parameters
    if (!prompt && !messages) {
      throw new Error('Either prompt or messages must be provided');
    }
    if (!model) {
      throw new Error('Model is required');
    }
    if (!apiKey) {
      throw new Error('API key is required');
    }
    if (!baseUrl) {
      throw new Error('Base URL is required');
    }

    // Set default options
    const defaultOptions = {
      temperature: 0.7,
      maxTokens: 2048,
      responseFormat: 'text',
    };

    const finalOptions = { ...defaultOptions, ...options };

    let result;
    if (isGeminiRequest) {
      // Use Google Generative AI SDK for Gemini requests
      const genAI = new GoogleGenerativeAI(apiKey);
      const geminiModel = genAI.getGenerativeModel({ model: model });

      // Prepare the prompt
      let fullPrompt = prompt;
      if (systemPrompt) {
        fullPrompt = `${systemPrompt}\n\n${prompt}`;
      }

      if (onStream) {
        // Streaming response
        result = await geminiModel.generateContentStream(fullPrompt);
        let fullContent = '';

        for await (const chunk of result.stream) {
          const chunkText = chunk.text();
          if (chunkText) {
            fullContent += chunkText;
            onStream(chunkText);
          }
        }

        return fullContent.trim();
      } else {
        // Non-streaming response
        result = await geminiModel.generateContent(fullPrompt);
        const response = await result.response;
        const content = response.text();

        if (!content) {
          throw new Error('No content received from Gemini API');
        }

        return content.trim();
      }
    } else {
      // Use OpenAI SDK for other providers
      // Create OpenAI client for this request
      const client = new OpenAI({
        apiKey,
        baseURL: baseUrl,
        dangerouslyAllowBrowser: true,
      });

      // Prepare messages
      let requestMessages = [];

      if (messages) {
        // Use provided messages array
        requestMessages = messages;
      } else {
        // Build messages from prompt and system prompt
        if (systemPrompt) {
          requestMessages.push({
            role: 'system',
            content: systemPrompt,
          });
        }
        requestMessages.push({
          role: 'user',
          content: prompt,
        });
      }

      if (onStream) {
        // Streaming response for OpenAI-compatible APIs
        const stream = await client.chat.completions.create({
          model,
          messages: requestMessages,
          temperature: finalOptions.temperature,
          max_tokens: finalOptions.maxTokens,
          ...(finalOptions.responseFormat === 'json' && {
            response_format: { type: 'json_object' },
          }),
          stream: true,
        });

        let fullContent = '';
        for await (const chunk of stream) {
          const chunkContent = chunk.choices[0]?.delta?.content;
          if (chunkContent) {
            fullContent += chunkContent;
            onStream(chunkContent);
          }
        }

        return fullContent.trim();
      } else {
        // Non-streaming response
        result = await client.chat.completions.create({
          model,
          messages: requestMessages,
          temperature: finalOptions.temperature,
          max_tokens: finalOptions.maxTokens,
          ...(finalOptions.responseFormat === 'json' && {
            response_format: { type: 'json_object' },
          }),
        });

        // Extract and return the response
        const content = result.choices[0]?.message?.content;
        if (!content) {
          throw new Error('No content received from API');
        }

        return content.trim();
      }
    }

  } catch (error) {
    // Enhanced error handling for both OpenAI and Gemini APIs
    if (isGeminiRequest) {
      // Handle Gemini API errors
      if (error.message) {
        if (error.message.includes('API_KEY_INVALID')) {
          throw new Error('Authentication failed. Please check your Gemini API key.');
        } else if (error.message.includes('RATE_LIMIT_EXCEEDED')) {
          throw new Error('Rate limit exceeded. Please wait a moment and try again.');
        } else if (error.message.includes('MODEL_NOT_FOUND')) {
          throw new Error(`Model "${model}" not found. Please check the model name.`);
        } else {
          throw new Error(`Gemini API error: ${error.message}`);
        }
      } else {
        throw new Error('An unexpected error occurred with Gemini API. Please try again.');
      }
    } else {
      // Handle OpenAI-compatible API errors
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;

        if (status === 401 || status === 403) {
          throw new Error('Authentication failed. Please check your API key.');
        } else if (status === 429) {
          throw new Error('Rate limit exceeded. Please wait a moment and try again.');
        } else if (status === 400) {
          throw new Error(`Invalid request: ${data?.error?.message || 'Bad request'}`);
        } else if (status === 404) {
          throw new Error(`Model "${model}" not found. Please check the model name.`);
        } else if (status >= 500) {
          throw new Error('Server error. Please try again later.');
        } else {
          throw new Error(`API error (${status}): ${data?.error?.message || 'Unknown error'}`);
        }
      } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        throw new Error('Network connection failed. Please check your internet connection.');
      } else if (error.message) {
        throw error; // Re-throw if it's already a proper error message
      } else {
        throw new Error('An unexpected error occurred. Please try again.');
      }
    }
  }
};

/**
 * Generic text generation helper using AI providers
 * @param {string} prompt - The prompt to send to AI
 * @param {string} provider - AI provider to use (default: 'A4F')
 * @param {string} model - Model key to use (default: 'GROK_4')
 * @param {Object} options - Additional options for the AI call
 * @returns {Promise<string>} Generated text response
 */
export const generateText = async (
  prompt,
  provider = 'A4F',
  model = 'GROK_4',
  options = {}
) => {
  return callWithProvider(provider, model, prompt, options);
};

/**
 * Generic JSON generation helper using AI providers
 * @param {string} prompt - The prompt to send to AI (should request JSON response)
 * @param {string} provider - AI provider to use (default: 'A4F')
 * @param {string} model - Model key to use (default: 'GROK_4')
 * @param {Object} options - Additional options for the AI call
 * @returns {Promise<Object>} Parsed JSON response
 */
export const generateJSON = async (
  prompt,
  provider = 'A4F',
  model = 'GROK_4',
  options = {}
) => {
  const response = await callWithProvider(provider, model, prompt, {
    ...options,
    responseFormat: 'json'
  });

  // Clean up the response to ensure it's valid JSON
  const cleanedText = response
    .replace(/```json\s*/g, "")
    .replace(/```\s*$/g, "")
    .trim();

  try {
    return JSON.parse(cleanedText);
  } catch {
    throw new Error("Failed to parse AI response as JSON. Please try again.");
  }
};

/**
 * Quick helper to call LLM with a specific provider
 *
 * @param {string} providerName - Name of the provider (A4F, GEMINI, GROQ, OPENROUTER)
 * @param {string} modelKey - Key of the model from the provider's models object
 * @param {string} prompt - The prompt to send
 * @param {Object} options - Optional parameters (temperature, maxTokens, etc.)
 * @param {Function} onStream - Optional callback for streaming responses (chunk) => void
 * @returns {Promise<string>} - The LLM response text
 *
 * @example
 * const response = await callWithProvider('A4F', 'GROK_4', 'What is AI?');
 * const geminiResponse = await callWithProvider('GEMINI', 'FLASH_2_5', 'Explain quantum computing');
 * // With streaming
 * let fullResponse = '';
 * const streamingResponse = await callWithProvider('GEMINI', 'FLASH_2_5', 'Tell me a story', {}, (chunk) => {
 *   fullResponse += chunk;
 *   console.log('Chunk:', chunk);
 * });
 */
export const callWithProvider = async (
  providerName,
  modelKey,
  prompt,
  options = {},
  onStream = null
) => {
  const provider = LLM_PROVIDERS[providerName];
  if (!provider) {
    throw new Error(`Provider "${providerName}" not found. Available providers: ${Object.keys(LLM_PROVIDERS).join(', ')}`);
  }

  const model = provider.models[modelKey];
  if (!model) {
    throw new Error(`Model "${modelKey}" not found for provider "${providerName}". Available models: ${Object.keys(provider.models).join(', ')}`);
  }

  const apiKey = provider.apiKey();
  if (!apiKey) {
    throw new Error(`API key for provider "${providerName}" is not configured. Please check your environment variables.`);
  }

  return llmClient({
    prompt,
    model,
    apiKey,
    baseUrl: provider.baseUrl,
    options,
    onStream,
  });
};

/**
 * Generate a book description using AI
 * @param {string} title - Book title
 * @param {string} author - Book author
 * @param {string} provider - AI provider to use (default: 'A4F')
 * @param {string} model - Model key to use (default: 'GROK_4')
 * @returns {Promise<string>} Generated description
 */
export const generateBookDescription = async (
  title,
  author,
  provider = 'A4F',
  model = 'GROK_4'
) => {
  const prompt = `Generate a compelling and informative book description for the following book:

Title: ${title}
Author: ${author || "Unknown"}

Please provide a description that includes:
- A brief overview of what the book is about
- The main themes or topics covered
- Why someone might want to read it
- Keep it between 100-200 words

Make it engaging and suitable for a library catalog. Do not use any markdown formatting like **bold** or *italic* text. Write in plain text only.`;

  return generateText(prompt, provider, model);
};

/**
 * Generate a cover description for book cover design using AI
 * @param {string} title - Book title
 * @param {string} author - Book author
 * @param {string} provider - AI provider to use (default: 'A4F')
 * @param {string} model - Model key to use (default: 'LLAMA_3_2')
 * @returns {Promise<string>} Generated cover description
 */
export const generateCoverDescription = async (
  title,
  author,
  provider = 'A4F',
  model = 'LLAMA_3_2'
) => {
  const prompt = `Generate a creative and visually descriptive prompt for designing a book cover for:

Title: "${title}"
Author: ${author || "Unknown"}

Create a detailed description that an AI image generator can use to create a professional book cover. Focus on:

- Visual style and aesthetic (modern, classic, artistic, minimalist, etc.)
- Color scheme and mood (warm, cool, dark, bright, mysterious, etc.)
- Key visual elements that represent the book's genre or theme
- Typography style suggestions
- Overall composition and layout hints
- Specific design motifs or symbols that would work well

Keep the description concise but detailed enough for AI image generation (50-100 words). Make it creative and specific to help generate an attractive, professional book cover.

Example style: "Modern minimalist design with clean typography, cool blue and silver color scheme, subtle geometric patterns, professional and contemporary look"

Do not include any plot spoilers or story details - focus purely on visual design elements.`;

  return generateText(prompt, provider, model);
};

/**
 * Generate book recommendations based on user's borrowing history
 * @param {Array} userBorrowedBooks - Array of user's last borrowed books
 * @param {Array} topBooks - Array of top 50 books in the library
 * @param {string} provider - AI provider to use (default: 'A4F')
 * @param {string} model - Model key to use (default: 'GROK_4')
 * @returns {Promise<Array>} Array of recommended books with reasoning
 */
export const generateBookRecommendations = async (
  userBorrowedBooks,
  topBooks,
  provider = 'A4F',
  model = 'GROK_4'
) => {
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

  return generateJSON(prompt, provider, model);
};

/**
 * Generate a book cover image using A4F API directly
 *
 * Uses Flux.1-schnell model for high-quality image generation with better quotas than Gemini free tier.
 *
 * @param {string} title - Book title
 * @param {string} author - Book author
 * @param {string} description - Optional cover description
 * @param {string} model - AI model to use for generation (default: provider-4/qwen-image)
 * @returns {Promise<string>} Base64 encoded image data
 */
export const generateBookCover = async (title, author, description = "", model = "provider-4/qwen-image") => {
  try {
    const prompt = `Design a professional, modern book cover for:

Title: "${title}"
Author: ${author || 'Unknown Author'}
${description ? `Description: ${description}` : ''}

${description ? '' : `Guidelines:
- Clean, elegant, and typography-focused design
- Prominent title, balanced author name
- Genre-reflective color palette
- Subtle abstract/geometric elements hinting at content
- High readability and contrast
- Avoid clutter — keep it sophisticated and minimal
- Background should enhance, not distract
`}

Restrictions:
- Use only abstract shapes, textures, or symbols
- No realistic or scene-based visuals

The cover must look bookstore-quality and visually captivating.`;

    // Use fetch directly to ensure proper A4F API integration
    const response = await fetch('https://api.a4f.co/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_A4F_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
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
