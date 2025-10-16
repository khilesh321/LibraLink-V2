import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import useUserRole from './useUserRole'

export default function Books() {
  const { role, loading: roleLoading } = useUserRole()
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [userTransactions, setUserTransactions] = useState([])
  const [actionLoading, setActionLoading] = useState(null)

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
      setBooks(data || [])
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

        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {books.map((book) => {
            const bookStatus = getBookStatus(book.id)
            const isAvailable = book.available

            return (
              <div key={book.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
                <div className="aspect-w-3 aspect-h-4 bg-gray-200">
                  {book.cover_image_url ? (
                    <img
                      src={book.cover_image_url}
                      alt={book.title}
                      className="w-full h-64 object-cover"
                    />
                  ) : (
                    <div className="w-full h-64 bg-gray-300 flex items-center justify-center">
                      <span className="text-gray-500 text-sm">No Cover</span>
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{book.title}</h3>

                  <div className="flex items-center justify-between mb-3">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      isAvailable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {isAvailable ? 'Available' : 'Issued'}
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
          })}
        </div>

        {books.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📚</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No books available</h3>
            <p className="text-gray-600">
              {(role === 'admin' || role === 'librarian')
                ? 'Add some books to get started!'
                : 'Check back later for new books.'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  )
}