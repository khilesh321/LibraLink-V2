import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import useUserRole from './useUserRole'

export default function Books() {
  const { role, loading: roleLoading } = useUserRole()
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [userTransactions, setUserTransactions] = useState([])
  const [actionLoading, setActionLoading] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchBooks()
    if (!roleLoading) {
      fetchUserTransactions()
    }
  }, [roleLoading])

  const fetchBooks = async () => {
    try {
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      // For each book, check if it's available using the database function
      const booksWithAvailability = await Promise.all(
        (data || []).map(async (book) => {
          try {
            const { data: available, error: availError } = await supabase.rpc('is_book_available', {
              book_uuid: book.id
            })

            return {
              ...book,
              available: availError ? true : available // fallback to true if error
            }
          } catch (err) {
            console.error('Error checking availability for book:', book.id, err)
            return {
              ...book,
              available: true // fallback to true if error
            }
          }
        })
      )

      setBooks(booksWithAvailability)
    } catch (error) {
      console.error('Error fetching books:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUserTransactions = async () => {
    if (!role) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('book_transactions')
        .select('book_id, action, due_date, transaction_date')
        .eq('user_id', user.id)
        .order('transaction_date', { ascending: false })

      if (error) throw error
      setUserTransactions(data || [])
    } catch (error) {
      console.error('Error fetching user transactions:', error)
    }
  }

  const getBookStatus = (bookId) => {
    const transactions = userTransactions.filter(t => t.book_id === bookId)
    if (transactions.length === 0) return null

    // Find the latest transaction
    const latestTransaction = transactions[0]
    const hasReturn = transactions.some(t => t.action === 'return' && t.transaction_date > latestTransaction.transaction_date)

    if (!hasReturn && (latestTransaction.action === 'issue' || latestTransaction.action === 'renew')) {
      return {
        status: 'issued',
        dueDate: latestTransaction.due_date
      }
    }

    return null
  }

  const handleIssueBook = async (bookId) => {
    setActionLoading(bookId)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { data, error } = await supabase.rpc('issue_book', {
        book_uuid: bookId,
        user_uuid: user.id
      })

      if (error) throw error

      if (data) {
        alert('Book issued successfully!')
        fetchBooks()
        fetchUserTransactions()
      } else {
        alert('Book is not available')
      }
    } catch (error) {
      console.error('Error issuing book:', error)
      alert('Failed to issue book: ' + error.message)
    } finally {
      setActionLoading(null)
    }
  }

  const handleReturnBook = async (bookId) => {
    setActionLoading(bookId)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { data, error } = await supabase.rpc('return_book', {
        book_uuid: bookId,
        user_uuid: user.id
      })

      if (error) throw error

      if (data) {
        alert('Book returned successfully!')
        fetchBooks()
        fetchUserTransactions()
      } else {
        alert('Failed to return book')
      }
    } catch (error) {
      console.error('Error returning book:', error)
      alert('Failed to return book: ' + error.message)
    } finally {
      setActionLoading(null)
    }
  }

  const handleRenewBook = async (bookId) => {
    setActionLoading(bookId)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { data, error } = await supabase.rpc('renew_book', {
        book_uuid: bookId,
        user_uuid: user.id
      })

      if (error) throw error

      if (data) {
        alert('Book renewed successfully!')
        fetchUserTransactions()
      } else {
        alert('Failed to renew book - it may not be issued to you')
      }
    } catch (error) {
      console.error('Error renewing book:', error)
      alert('Failed to renew book: ' + error.message)
    } finally {
      setActionLoading(null)
    }
  }

  // Filter books based on search query
  const filteredBooks = books.filter((book) => {
    const query = searchQuery.toLowerCase()
    return (
      book.title?.toLowerCase().includes(query) ||
      book.author?.toLowerCase().includes(query) ||
      book.description?.toLowerCase().includes(query) ||
      book.genre?.toLowerCase().includes(query)
    )
  })

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading books...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Library Books</h1>
          {(role === 'admin' || role === 'librarian') && (
            <button
              onClick={() => window.location.href = '/books/add'}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-300"
            >
              Add New Book
            </button>
          )}
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="max-w-md mx-auto">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search books by title, author, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
          {searchQuery && (
            <div className="text-center mt-2">
              <span className="text-sm text-gray-600">
                Found {filteredBooks.length} book{filteredBooks.length !== 1 ? 's' : ''} matching "{searchQuery}"
              </span>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredBooks.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <div className="text-6xl mb-4">📚</div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                {searchQuery ? 'No books found' : 'No books available'}
              </h2>
              <p className="text-gray-600">
                {searchQuery 
                  ? `No books match your search for "${searchQuery}". Try different keywords.`
                  : 'Books will appear here once they are added to the library.'
                }
              </p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition duration-200"
                >
                  Clear Search
                </button>
              )}
            </div>
          ) : (
            filteredBooks.map((book) => {
            const bookStatus = getBookStatus(book.id)
            const isAvailable = book.available

            return (
              <div key={book.id} className="bg-white group relative rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow md:min-h-[72.5vh] duration-300">
                <div className="bg-gray-200">
                  {book.cover_image_url ? (
                    <img
                      src={book.cover_image_url}
                      alt={book.title}
                      className="w-full object-cover md:absolute md:group-hover:scale-x-0 mx-auto transition duration-300"
                    />
                  ) : (
                    <div className="w-full h-64 bg-gray-300 flex items-center justify-center">
                      <span className="text-gray-500 text-sm">No Cover</span>
                    </div>
                  )}
                </div>

                <div className={`p-4 ${book.cover_image_url && 'md:mt-5'}`}>
                  <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{book.title}</h3>

                  {book.author && (
                    <p className="text-sm text-gray-600 mb-1">by {book.author}</p>
                  )}

                  {book.description && (
                    <p className="text-sm text-gray-700 mb-3 line-clamp-3">{book.description}</p>
                  )}

                  <div className="flex items-center justify-between mb-3">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      isAvailable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {isAvailable ? 'Available' : 'Issued'}
                    </span>
                    <span className="text-sm text-gray-600">
                      {book.count || 1} {book.count === 1 ? 'copy' : 'copies'}
                    </span>
                  </div>

                  {bookStatus && (
                    <div className="mb-3 p-2 bg-blue-50 rounded text-sm">
                      <p className="text-blue-800">Issued to you</p>
                      {bookStatus.dueDate && (
                        <p className="text-blue-600">
                          Due: {new Date(bookStatus.dueDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex space-x-2">
                    {bookStatus ? (
                      <>
                        <button
                          onClick={() => handleReturnBook(book.id)}
                          disabled={actionLoading === book.id}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-2 px-3 rounded transition duration-300 disabled:opacity-50"
                        >
                          {actionLoading === book.id ? 'Returning...' : 'Return'}
                        </button>
                        <button
                          onClick={() => handleRenewBook(book.id)}
                          disabled={actionLoading === book.id}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-3 rounded transition duration-300 disabled:opacity-50"
                        >
                          {actionLoading === book.id ? 'Renewing...' : 'Renew'}
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleIssueBook(book.id)}
                        disabled={actionLoading === book.id || !isAvailable}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {actionLoading === book.id ? 'Issuing...' : isAvailable ? 'Issue Book' : 'Unavailable'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          }))}
        </div>
      </div>
    </div>
  )
}