import { Routes, Route, BrowserRouter } from "react-router-dom";
import Navbar from "./components/Navbar";
import Login from "./Auth/Login.jsx";
import Home from "./pages/Home.jsx";
import PdfUpload from "./pages/PdfUpload.jsx";
import Resources from "./pages/Resources.jsx";
import EditResource from "./components/EditResource.jsx";
import RoleManager from "./pages/RoleManager.jsx";
import Books from "./pages/Books.jsx";
import AddBook from "./components/AddBook.jsx";
import EditBook from "./components/EditBook.jsx";
import BookDetailsPage from "./pages/BookDetailsPage.jsx";
import MyTransactions from "./pages/MyTransactions.jsx";
import AdminTransactions from "./pages/AdminTransactions.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";
import Register from "./Auth/Register.jsx";
import Recommendations from "./pages/Recommendations.jsx";
import AnalyticsDashboard from "./components/AnalyticsDashboard.jsx";
import Footer from "./components/Footer.jsx";
import AIChatbot from "./components/AIChatbot.jsx";
import BookPDFGeneratorPage from "./pages/BookPDFGeneratorPage.jsx";
import { ReactLenis } from "lenis/react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function App() {

  return (
    <BrowserRouter>
    <div className="min-h-screen">
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
          <Route path="/my-transactions" element={<MyTransactions />} />
          <Route path="/recommendations" element={<Recommendations />} />
          <Route path="/book-pdf-generator" element={<BookPDFGeneratorPage />} />
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
    </div>
    </BrowserRouter>
  );
}
