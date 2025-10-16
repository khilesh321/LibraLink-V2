import PdfUpload from './PdfUpload'
import useUserRole from './useUserRole'
import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

export default function Home() {
  const { role, loading } = useUserRole()
  const [user, setUser] = useState(null)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* User Info Section */}
      {user && !loading && (
        <div className="bg-white shadow-sm">
          <div className="container mx-auto px-4 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                  {user.email?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm text-gray-600">Welcome back,</p>
                  <p className="font-semibold text-gray-900">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">Role:</span>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  role === 'admin'
                    ? 'bg-red-100 text-red-800'
                    : role === 'librarian'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-green-100 text-green-800'
                }`}>
                  {role}
                </span>
                <button
                  onClick={() => supabase.auth.signOut()}
                  className="text-gray-500 hover:text-gray-700 text-sm underline"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Welcome to <span className="text-blue-600">LibraLink</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Streamline your library operations with our comprehensive management system.
            Manage books, patrons, and transactions effortlessly.
          </p>
          <div className="flex justify-center space-x-4">
            <a href="/resources" className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-300">
              Browse Resources
            </a>
            {role === 'librarian' && (
              <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-300">
                Get Started
              </button>
            )}
            {role === 'admin' && (
              <a href="/admin/roles" className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-300">
                Manage Roles
              </a>
            )}
            <button className="bg-white hover:bg-gray-50 text-blue-600 font-semibold py-3 px-6 rounded-lg border border-blue-600 transition duration-300">
              Learn More
            </button>
          </div>
        </div>
      </div>

      {/* Role-specific Dashboard */}
      {!loading && role && (
        <div className="container mx-auto px-4 py-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {role === 'admin' ? 'Admin Dashboard' : role === 'librarian' ? 'Librarian Dashboard' : 'Student Dashboard'}
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-blue-600 text-2xl mb-2">📚</div>
                <h3 className="font-semibold text-gray-900">Browse Resources</h3>
                <p className="text-sm text-gray-600">Access all library materials</p>
                <a href="/resources" className="text-blue-600 hover:text-blue-800 text-sm font-medium mt-2 inline-block">
                  View Resources →
                </a>
              </div>

              {(role === 'librarian' || role === 'admin') && (
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-green-600 text-2xl mb-2">📤</div>
                  <h3 className="font-semibold text-gray-900">Upload Documents</h3>
                  <p className="text-sm text-gray-600">Add new materials to the library</p>
                  <a href="/upload" className="text-green-600 hover:text-green-800 text-sm font-medium mt-2 inline-block">
                    Upload PDF →
                  </a>
                </div>
              )}

              {role === 'admin' && (
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-purple-600 text-2xl mb-2">👥</div>
                  <h3 className="font-semibold text-gray-900">Manage Users</h3>
                  <p className="text-sm text-gray-600">Control user roles and permissions</p>
                  <a href="/admin/roles" className="text-purple-600 hover:text-purple-800 text-sm font-medium mt-2 inline-block">
                    Manage Roles →
                  </a>
                </div>
              )}

              <div className={`p-4 rounded-lg ${role === 'student' ? 'bg-green-50' : 'bg-gray-50'}`}>
                <div className={`text-2xl mb-2 ${role === 'student' ? 'text-green-600' : 'text-gray-600'}`}>📖</div>
                <h3 className="font-semibold text-gray-900">My Role</h3>
                <p className="text-sm text-gray-600 capitalize">{role}</p>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full mt-2 ${
                  role === 'admin'
                    ? 'bg-red-100 text-red-800'
                    : role === 'librarian'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-green-100 text-green-800'
                }`}>
                  {role}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Features Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Key Features</h2>
          <p className="text-gray-600">Everything you need to manage your library efficiently</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-blue-600 text-4xl mb-4">📚</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Book Management</h3>
            <p className="text-gray-600">Add, update, and organize your book collection with ease.</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-green-600 text-4xl mb-4">👥</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Patron Management</h3>
            <p className="text-gray-600">Keep track of library members and their borrowing history.</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-purple-600 text-4xl mb-4">📊</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Analytics & Reports</h3>
            <p className="text-gray-600">Generate insights and reports on library usage and performance.</p>
          </div>
        </div>
      </div>

      {/* PDF Upload Section */}
      {/* <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Upload Documents</h2>
          <p className="text-gray-600">Upload PDF files to your library collection</p>
        </div>
        <PdfUpload />
      </div> */}

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-8">
        <div className="container mx-auto px-4 text-center">
          <p>&copy; 2025 LibraLink. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
