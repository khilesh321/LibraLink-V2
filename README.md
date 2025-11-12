# LibraLink V2 - Advanced Library Management System

A cutting-edge library management system built with React 19, Vite, Supabase, and integrated with multiple AI providers for intelligent book management, content generation, and personalized recommendations.

## 🚀 Features

### 📚 Core Library Management
- **Book Management**: Add, edit, delete, and browse books with AI-generated cover images
- **Resource Management**: Upload and manage PDF documents with AI-generated covers
- **Transaction Management**: Issue, return, and renew books with QR code scanning
- **User Management**: Role-based access control (Admin, Librarian, User)
- **Wishlist**: Save books for later reading
- **Rating System**: Rate books out of 10 with optional comments when returning

### 🤖 AI-Powered Features

#### Multi-Provider AI Integration
- **Google Gemini**: Advanced text generation and analysis
- **A4F API**: High-quality AI image generation
- **Groq**: Fast inference with multiple models
- **OpenRouter**: Access to 100+ AI models
- **LLM7**: Specialized AI models
- **Chutes AI**: Additional AI capabilities

#### AI Book Cover Generation
- Generate professional book covers using multiple AI models:
  - Midjourney V7 (default)
  - Qwen Image
  - Grok-4
  - And more...
- Download covers in high resolution
- Custom prompts and descriptions

#### AI Content Generation
- **Book Descriptions**: Generate detailed book descriptions using AI
- **AI Chatbot**: Intelligent assistant for library navigation and book discovery
- **Personalized Recommendations**: AI analyzes reading history to suggest books
- **AI Book Generation**: Create complete books with table of contents and chapters

#### AI Chatbot Capabilities
- Search books by title, author, genre, or topic
- Get book summaries and recommendations
- Answer questions about library policies
- Provide reading suggestions
- Help with navigation and features

### 📊 Analytics & Administration
- **Comprehensive Dashboard**: Real-time analytics and reports
- **Transaction Analytics**: Monthly borrowing trends and statistics
- **Top Books & Users**: Most borrowed books and active users
- **Role Management**: Assign and manage user roles
- **Admin Transactions**: Monitor all library transactions

### 🎨 Modern UI/UX
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile
- **Smooth Animations**: Framer Motion powered transitions
- **Interactive Elements**: Engaging user interface with hover effects
- **Loading States**: Beautiful loading animations and progress indicators

## 🛠 Tech Stack

### Frontend
- **React 19**: Latest React with modern hooks and features
- **Vite**: Fast build tool and development server
- **Tailwind CSS**: Utility-first CSS framework
- **React Router**: Client-side routing
- **Framer Motion**: Animation library
- **React Toastify**: Notification system

### Backend & Database
- **Supabase**: PostgreSQL database, authentication, and file storage
- **Row Level Security**: Database-level access control
- **Real-time Subscriptions**: Live updates for transactions

### AI Integration
- **Google Generative AI**: Gemini models for text generation
- **A4F API**: Image generation service
- **Groq**: Fast AI inference
- **OpenRouter**: Multi-model AI access
- **LLM7**: Specialized AI models

### Additional Libraries
- **Lucide React**: Beautiful icons
- **QRCode.react**: QR code generation
- **jsPDF**: PDF generation and manipulation
- **HTML2Canvas**: Screenshot and image conversion
- **React Markdown**: Markdown rendering
- **React Responsive**: Responsive design utilities
- **Lenis**: Smooth scrolling
- **Spline**: 3D graphics (for animations)

## 🔧 Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key

# AI API Keys
VITE_GEMINI_API_KEY=your_google_gemini_api_key
VITE_A4F_API_KEY=your_a4f_api_key
VITE_GROQ_API_KEY=your_groq_api_key
VITE_OPENROUTER_API_KEY=your_openrouter_api_key
VITE_LLM7_API_KEY=your_llm7_api_key
VITE_CHUTES_API_KEY=your_chutes_api_key

# Application URLs
VITE_FRONTEND_URL=http://localhost:5173
```

### Getting API Keys

#### Google Gemini API Key
1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Sign in with your Google account
3. Create a new API key
4. Copy the API key to your `.env` file

#### A4F API Key
1. Sign up at [A4F](https://a4f.co/)
2. Get your API key from the dashboard
3. Add it to your `.env` file

#### Other AI Providers
- **Groq**: [groq.com](https://groq.com/)
- **OpenRouter**: [openrouter.ai](https://openrouter.ai/)
- **LLM7**: [llm7.io](https://llm7.io/)
- **Chutes AI**: [chutes.ai](https://chutes.ai/)

## 🗄️ Database Setup

### Supabase Configuration

1. Create a new Supabase project
2. Run the SQL scripts in the `database/` directory:
   - `create_ratings_table.sql` - Creates book ratings system
   - Additional tables for books, users, transactions, and resources

### Database Tables

The application uses the following main tables:
- `books` - Book catalog with metadata
- `book_transactions` - Borrowing/returning records
- `book_ratings` - User ratings and reviews
- `resources` - PDF documents and resources
- `user_roles` - Role-based access control

## 📖 Usage Guide

### For Users

#### Browsing and Borrowing Books
1. Browse the book catalog with AI-generated covers
2. View detailed book information and ratings
3. Use QR codes for quick book issuing
4. Add books to your wishlist
5. Rate books when returning them

#### AI Features
- **Chat with AI Assistant**: Click the floating chat icon for help
- **Get Recommendations**: Visit "AI Recommendations" for personalized suggestions
- **Search Books**: Use the AI chatbot to find books by any criteria

### For Librarians/Admins

#### Book Management
1. Add new books with AI-generated descriptions and covers
2. Upload PDF resources with AI-generated covers
3. Manage book inventory and availability
4. Monitor transactions and user activity

#### AI Content Generation
- **Generate Book Covers**: Use multiple AI models for professional covers
- **Create AI Books**: Generate complete books with chapters
- **AI Descriptions**: Auto-generate book descriptions

#### Analytics
- View borrowing trends and statistics
- Monitor top books and active users
- Generate reports for library insights

## 🚀 Deployment

### Vercel Deployment

1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push

### Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 📱 API Endpoints

The application includes serverless API routes for CORS-free AI operations:

- `/api/generate-book-cover` - AI book cover generation proxy

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow React best practices and hooks patterns
- Use TypeScript for type safety (planned)
- Maintain consistent code formatting
- Add tests for new features
- Update documentation for API changes

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **Supabase** for the amazing backend-as-a-service platform
- **Google AI** for Gemini models
- **A4F** for high-quality AI image generation
- **OpenRouter** for multi-model AI access
- **All contributors** who help improve this project

---

**LibraLink V2** - Revolutionizing library management with the power of AI. 📚✨

---

<div align="center">
  <p>Built with ❤️ by <a href="https://github.com/khilesh321">Khilesh Jawale</a></p>
</div>
