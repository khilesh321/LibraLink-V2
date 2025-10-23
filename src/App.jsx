import { Routes, Route, BrowserRouter } from "react-router-dom";
import { lazy, Suspense, useEffect, useState } from "react";
// Lazy load components for better performance
const Navbar = lazy(() => import("./components/Navbar"));
const Login = lazy(() => import("./Auth/Login.jsx"));
const Home = lazy(() => import("./pages/Home.jsx"));
const PdfUpload = lazy(() => import("./pages/PdfUpload.jsx"));
const Resources = lazy(() => import("./pages/Resources.jsx"));
const EditResource = lazy(() => import("./components/EditResource.jsx"));
const RoleManager = lazy(() => import("./pages/RoleManager.jsx"));
const Books = lazy(() => import("./pages/Books.jsx"));
const AddBook = lazy(() => import("./components/AddBook.jsx"));
const EditBook = lazy(() => import("./components/EditBook.jsx"));
const BookDetailsPage = lazy(() => import("./pages/BookDetailsPage.jsx"));
const ResourceDetailsPage = lazy(() => import("./pages/ResourceDetailsPage.jsx"));
const MyTransactions = lazy(() => import("./pages/MyTransactions.jsx"));
const AdminTransactions = lazy(() => import("./pages/AdminTransactions.jsx"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword.jsx"));
const ResetPassword = lazy(() => import("./pages/ResetPassword.jsx"));
const Register = lazy(() => import("./Auth/Register.jsx"));
const Recommendations = lazy(() => import("./pages/Recommendations.jsx"));
const AnalyticsDashboard = lazy(() => import("./components/AnalyticsDashboard.jsx"));
const Footer = lazy(() => import("./components/Footer.jsx"));
const AIChatbot = lazy(() => import("./components/AIChatbot.jsx"));
const BookPDFGeneratorPage = lazy(() => import("./pages/BookPDFGeneratorPage.jsx"));
import { ReactLenis } from "lenis/react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import GlobalLoader from "./components/GlobalLoader";
const Wishlist = lazy(() => import("./pages/Wishlist.jsx"));

export default function App() {
  const [isLoading, setIsLoading] = useState(true)
    
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 2500)

    return () => clearTimeout(timer)
  }, [])
  
  if (isLoading) {
    return <GlobalLoader isLoading={true} loadingText="Initializing LibraLink..." />
  }

  return (
    <BrowserRouter>
    <div className="min-h-screen">
      {/* <Suspense fallback={<GlobalLoader isLoading={true} loadingText="Loading your library..." />}> */}
        <Navbar />
        <ReactLenis root>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/upload" element={<PdfUpload />} />
            <Route path="/resources" element={<Resources />} />
            <Route path="/resources/edit/:id" element={<EditResource />} />
            <Route path="/admin/roles" element={<RoleManager />} />
            <Route path="/admin/transactions" element={<AdminTransactions />} />
            <Route path="/admin/analytics" element={<AnalyticsDashboard />} />
            <Route path="/books" element={<Books />} />
            <Route path="/books/add" element={<AddBook />} />
            <Route path="/books/edit/:id" element={<EditBook />} />
            <Route path="/book/:id" element={<BookDetailsPage />} />
            <Route path="/resource/:id" element={<ResourceDetailsPage />} />
            <Route path="/my-transactions" element={<MyTransactions />} />
            <Route path="/recommendations" element={<Recommendations />} />
            <Route path="/ai-resource-generator" element={<BookPDFGeneratorPage />} />
            <Route path="/wishlist" element={<Wishlist />} />
          </Routes>
        </ReactLenis>
        <Footer />
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />
        <AIChatbot />
      {/* </Suspense> */}
    </div>
    </BrowserRouter>
  );
}
