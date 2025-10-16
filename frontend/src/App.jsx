import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Login from './Auth/Login.jsx'
import Home from './Home.jsx'
import PdfUpload from './PdfUpload.jsx'
import Resources from './Resources.jsx'
import RoleManager from './RoleManager.jsx'
import Books from './Books.jsx'
import AddBook from './AddBook.jsx'
import MyTransactions from './MyTransactions.jsx'
import AdminTransactions from './AdminTransactions.jsx'
import ForgotPassword from './ForgotPassword.jsx'
import ResetPassword from './ResetPassword.jsx'
import Register from './Register.jsx'
// import SignUp from './signup.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/upload" element={<PdfUpload />} />
        <Route path="/resources" element={<Resources />} />
        <Route path="/admin/roles" element={<RoleManager />} />
        <Route path="/admin/transactions" element={<AdminTransactions />} />
        <Route path="/books" element={<Books />} />
        <Route path="/books/add" element={<AddBook />} />
        <Route path="/my-transactions" element={<MyTransactions />} />
        {/* <Route path="/signup" element={<SignUp />} /> */}
      </Routes>
    </BrowserRouter>
  )
}
