import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import useUserRole from './useUserRole'
import { BookOpen, Calendar, Clock, AlertCircle, CheckCircle, Download } from 'lucide-react'
import { generateTransactionsPDF, generateTransactionsCSV } from './pdfUtils'

export default function MyTransactions() {
  const { role, loading: roleLoading } = useUserRole()
  const [transactions, setTransactions] = useState([])
  const [books, setBooks] = useState({})
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)

  useEffect(() => {
    if (!roleLoading) {
      if (!role) {
        // Redirect to login if not authenticated
        window.location.href = '/login'
        return
      }
      fetchUserAndTransactions()
    }
  }, [roleLoading, role])

  const fetchUserAndTransactions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      setUser(user)

      // Fetch user's transactions
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('book_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('transaction_date', { ascending: false })

      if (transactionsError) throw transactionsError

      console.log('User transactions:', transactionsData)
      setTransactions(transactionsData || [])

      // Fetch book details for the transactions
      const bookIds = [...new Set(transactionsData?.map(t => t.book_id) || [])]
      console.log('Book IDs for user transactions:', bookIds)
      if (bookIds.length > 0) {
        const { data: booksData, error: booksError } = await supabase
          .from('books')
          .select('id, title, author, description')
          .in('id', bookIds)

        console.log('Books data for user:', booksData)
        if (booksError) {
          console.error('Error fetching books for user:', booksError)
        } else {
          const booksMap = {}
          booksData?.forEach(book => {
            booksMap[book.id] = book
          })
          setBooks(booksMap)
        }
      }

    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getActionIcon = (action) => {
    switch (action) {
      case 'issue':
        return <BookOpen className="w-5 h-5 text-blue-600" />
      case 'return':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'renew':
        return <Clock className="w-5 h-5 text-orange-600" />
      default:
        return <AlertCircle className="w-5 h-5 text-gray-600" />
    }
  }

  const getActionColor = (action) => {
    switch (action) {
      case 'issue':
        return 'bg-blue-100 text-blue-800'
      case 'return':
        return 'bg-green-100 text-green-800'
      case 'renew':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleExportPDF = async () => {
    try {
      await generateTransactionsPDF(
        transactions,
        books,
        {}, // No users data for personal transactions
        'My Transaction History',
        user
      )
    } catch (error) {
      console.error('Error exporting PDF:', error)
      alert('Failed to export PDF. Please try again.')
    }
  }

  const handleExportCSV = () => {
    try {
      generateTransactionsCSV(
        transactions,
        books,
        {}, // No users data for personal transactions
        'My Transaction History',
        user
      )
    } catch (error) {
      console.error('Error exporting CSV:', error)
      alert('Failed to export CSV. Please try again.')
    }
  }

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your transactions...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Transactions</h1>
              <p className="text-gray-600">View your book borrowing history</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleExportPDF}
                disabled={transactions.length === 0}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                <Download className="w-4 h-4 mr-2" />
                Export PDF
              </button>
              <button
                onClick={handleExportCSV}
                disabled={transactions.length === 0}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {transactions.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Transactions Yet</h3>
            <p className="text-gray-600 mb-6">You haven't borrowed any books yet. Start exploring our collection!</p>
            <Link
              to="/books"
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <BookOpen className="w-5 h-5 mr-2" />
              Browse Books
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Transaction History ({transactions.length})
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Book Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Transaction Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Due Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {transactions.map((transaction, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getActionIcon(transaction.action)}
                          <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getActionColor(transaction.action)}`}>
                            {transaction.action.charAt(0).toUpperCase() + transaction.action.slice(1)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          📖 {books[transaction.book_id]?.title || 'Unknown Book'}
                        </div>
                        <div className="text-sm text-gray-600">
                          Book ID: {transaction.book_id}
                        </div>
                        <div className="text-sm text-gray-500">
                          {books[transaction.book_id]?.author && `by ${books[transaction.book_id].author}`}
                        </div>
                        {books[transaction.book_id]?.description && (
                          <div className="text-xs text-gray-400">
                            {books[transaction.book_id].description}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1 text-gray-400" />
                          {formatDate(transaction.transaction_date)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {transaction.due_date ? (
                          <div className="flex items-center">
                            <Clock className="w-4 h-4 mr-1 text-gray-400" />
                            {formatDate(transaction.due_date)}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}