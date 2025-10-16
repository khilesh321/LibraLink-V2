import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Login from './Auth/Login.jsx'
import Home from './Home.jsx'
import PdfUpload from './PdfUpload.jsx'
import Resources from './Resources.jsx'
import RoleManager from './RoleManager.jsx'
// import SignUp from './signup.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/upload" element={<PdfUpload />} />
        <Route path="/resources" element={<Resources />} />
        <Route path="/admin/roles" element={<RoleManager />} />
        {/* <Route path="/signup" element={<SignUp />} /> */}
      </Routes>
    </BrowserRouter>
  )
}
