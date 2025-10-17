# LibraLink V2 - Library Management System

A modern library management system built with React, Vite, Supabase, and integrated with Google Gemini AI for intelligent book recommendations and description generation.

## Features

- **Book Management**: Add, edit, delete, and browse books with cover images
- **AI-Powered Features**:
  - Generate book descriptions using Google Gemini AI
  - Personalized book recommendations based on reading history
- **User Management**: Role-based access control (Admin, Librarian, User)
- **PDF Resources**: Upload and manage PDF documents
- **Transaction Management**: Issue, return, and renew books with QR codes
- **Analytics**: Comprehensive admin dashboard with reports

## Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Authentication, Storage)
- **AI Integration**: Google Gemini AI
- **UI Components**: Lucide React icons, React Toastify notifications
- **Additional**: React Router, Framer Motion, HTML2Canvas, jsPDF

## Environment Variables

Create a `.env` file in the frontend directory with the following variables:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
VITE_GEMINI_API_KEY=your_google_gemini_api_key
```

### Getting a Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Sign in with your Google account
3. Create a new API key
4. Copy the API key and add it to your `.env` file

## Installation

1. Clone the repository
2. Navigate to the frontend directory
3. Install dependencies:
   ```bash
   npm install
   ```
4. Set up environment variables (see above)
5. Start the development server:
   ```bash
   npm run dev
   ```

## Usage

### AI Features

#### Generate Book Descriptions
- Go to "Add Book" page (Admin/Librarian only)
- Enter book title and author
- Click "Generate with AI" button to create a description

#### Book Recommendations
- Navigate to "AI Recommendations" from the Books menu
- The system analyzes your last 5 borrowed books
- AI generates personalized recommendations from the top books in the library
- Click "Issue Book" to borrow recommended books

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request
