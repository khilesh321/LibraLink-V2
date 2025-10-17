import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Login from './Auth/Login.jsx'
import Home from './Home.jsx'
import PdfUpload from './PdfUpload.jsx'
import Resources from './Resources.jsx'
import EditResource from './EditResource.jsx'
import RoleManager from './RoleManager.jsx'
import Books from './Books.jsx'
import AddBook from './AddBook.jsx'
import EditBook from './EditBook.jsx'
import MyTransactions from './MyTransactions.jsx'
import AdminTransactions from './AdminTransactions.jsx'
import ForgotPassword from './ForgotPassword.jsx'
import ResetPassword from './ResetPassword.jsx'
import Register from './Register.jsx'
import Recommendations from './Recommendations.jsx'
import Footer from './Footer';
import { ReactLenis } from 'lenis/react'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

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
          <Route path="/books" element={<Books />} />
          <Route path="/books/add" element={<AddBook />} />
          <Route path="/books/edit/:id" element={<EditBook />} />
          <Route path="/my-transactions" element={<MyTransactions />} />
          <Route path="/recommendations" element={<Recommendations />} />
        </Routes>
        </ReactLenis>
        <Footer />
      </div>
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
    </BrowserRouter>
  )
}
