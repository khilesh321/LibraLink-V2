import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import useUserRole from './useUserRole'
import { Download, Filter, Search, BookOpen, CheckCircle, Clock, AlertCircle, Calendar } from 'lucide-react'
import { generateTransactionsPDF, generateTransactionsCSV } from './pdfUtils'

export default function AdminTransactions() {
  const { role, loading: roleLoading } = useUserRole()
  const [transactions, setTransactions] = useState([])
  const [books, setBooks] = useState({})
  const [users, setUsers] = useState({})
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [actionFilter, setActionFilter] = useState('all')
  const [currentUser, setCurrentUser] = useState(null)

  useEffect(() => {
    if (!roleLoading) {
      if (!role || (role !== 'admin' && role !== 'librarian')) {
        // Redirect if not admin or librarian
        window.location.href = '/'
        return
      }
      fetchCurrentUserAndData()
    }
  }, [roleLoading, role])

  const fetchCurrentUserAndData = async () => {
    let transactionsData = []

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      setCurrentUser(user)
      console.log('Current user:', user)
      console.log('Current user role from hook:', role)

      // Check if user has admin/l librarian role
      if (!role || (role !== 'admin' && role !== 'librarian')) {
        console.log('User does not have admin/librarian role, redirecting')
        window.location.href = '/'
        return
      }

      // Try using RPC function to get all transactions (bypassing RLS)
      console.log('Trying RPC function for transactions...')
      try {
        const { data: rpcTransactions, error: rpcError } = await supabase.rpc('get_all_transactions')
        if (!rpcError && rpcTransactions) {
          console.log('RPC transactions successful:', rpcTransactions)
          transactionsData = rpcTransactions
          setTransactions(rpcTransactions)
        } else {
          console.log('RPC failed, falling back to direct query:', rpcError)
          // Fetch all transactions
          const { data: directTransactions, error: transactionsError } = await supabase
            .from('book_transactions')
            .select('*')
            .order('transaction_date', { ascending: false })

          if (transactionsError) {
            console.error('Error fetching transactions:', transactionsError)
            console.error('Error details:', {
              message: transactionsError.message,
              details: transactionsError.details,
              hint: transactionsError.hint
            })
            throw transactionsError
          }

          console.log('Transactions data:', directTransactions)
          console.log('Number of transactions:', directTransactions?.length || 0)
          transactionsData = directTransactions || []
          setTransactions(transactionsData)
        }
      } catch (rpcErr) {
        console.log('RPC function not available, using direct query')
          // Fetch all transactions
        const { data: outerTransactionsData, error: transactionsError } = await supabase
          .from('book_transactions')
          .select('*')
          .order('transaction_date', { ascending: false })

        if (transactionsError) {
          console.error('Error fetching transactions:', transactionsError)
          throw transactionsError
        }

        console.log('Transactions data:', outerTransactionsData)
        transactionsData = outerTransactionsData || []
        setTransactions(transactionsData)
      }

      // Fetch book details
      const bookIds = [...new Set(transactionsData?.map(t => t.book_id) || [])]
      console.log('Book IDs from transactions:', bookIds)
      if (bookIds.length > 0) {
        // First test if we can access books at all
        console.log('Testing books table access...')
        const { data: testBooks, error: testBooksError } = await supabase
          .from('books')
          .select('count', { count: 'exact', head: true })

        console.log('Books count test:', { count: testBooks, error: testBooksError })

        const { data: booksData, error: booksError } = await supabase
          .from('books')
          .select('id, title, author, description')
          .in('id', bookIds)

        if (booksError) {
          console.error('Error fetching books:', booksError)
          console.error('Books error details:', {
            message: booksError.message,
            details: booksError.details,
            hint: booksError.hint
          })
          console.error('Book IDs that failed:', bookIds)
        } else {
          console.log('Books data:', booksData)
          const booksMap = {}
          booksData?.forEach(book => {
            booksMap[book.id] = book
          })
          setBooks(booksMap)
        }
      }

      // Fetch user details from profiles table
      const userIds = [...new Set(transactionsData?.map(t => t.user_id) || [])]
      console.log('User IDs from transactions:', userIds)
      if (userIds.length > 0) {
        const { data: usersData, error: usersError } = await supabase
          .from('profiles')
          .select('id, role')
          .in('id', userIds)

        console.log('Users data from profiles:', usersData)
        console.log('Users error:', usersError)

        const usersMap = {}
        usersData?.forEach(user => {
          usersMap[user.id] = {
            email: `User ${user.id.slice(0, 8)}`, // Use user ID as fallback since email might not be in profiles
            role: user.role || 'student'
          }
        })

        // For users without profiles, add them with default data
        userIds.forEach(userId => {
          if (!usersMap[userId]) {
            usersMap[userId] = {
              email: `User ${userId.slice(0, 8)}`,
              role: 'student'
            }
          }
        })

        setUsers(usersMap)
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
        filteredTransactions,
        books,
        users,
        'All Library Transactions',
        currentUser
      )
    } catch (error) {
      console.error('Error exporting PDF:', error)
      alert('Failed to export PDF. Please try again.')
    }
  }

  const handleExportCSV = () => {
    try {
      generateTransactionsCSV(
        filteredTransactions,
        books,
        users,
        'All Library Transactions',
        currentUser
      )
    } catch (error) {
      console.error('Error exporting CSV:', error)
      alert('Failed to export CSV. Please try again.')
    }
  }

  // Filter transactions based on search and action filter
  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch =
      searchTerm === '' ||
      books[transaction.book_id]?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      books[transaction.book_id]?.author?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      users[transaction.user_id]?.email?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesAction = actionFilter === 'all' || transaction.action === actionFilter

    return matchesSearch && matchesAction
  })

  // Calculate statistics
  const stats = {
    total: transactions.length,
    issues: transactions.filter(t => t.action === 'issue').length,
    returns: transactions.filter(t => t.action === 'return').length,
    renewals: transactions.filter(t => t.action === 'renew').length,
    uniqueUsers: new Set(transactions.map(t => t.user_id)).size,
    uniqueBooks: new Set(transactions.map(t => t.book_id)).size
  }

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading transactions...</p>
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
              <h1 className="text-2xl font-bold text-gray-900">All Transactions</h1>
              <p className="text-gray-600">Manage and monitor all library transactions</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleExportPDF}
                disabled={filteredTransactions.length === 0}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                <Download className="w-4 h-4 mr-2" />
                Export PDF
              </button>
              <button
                onClick={handleExportCSV}
                disabled={filteredTransactions.length === 0}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-600">Total Transactions</div>
          </div>
          <div className="bg-blue-50 rounded-lg shadow p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.issues}</div>
            <div className="text-sm text-gray-600">Books Issued</div>
          </div>
          <div className="bg-green-50 rounded-lg shadow p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.returns}</div>
            <div className="text-sm text-gray-600">Books Returned</div>
          </div>
          <div className="bg-orange-50 rounded-lg shadow p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.renewals}</div>
            <div className="text-sm text-gray-600">Books Renewed</div>
          </div>
          <div className="bg-purple-50 rounded-lg shadow p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.uniqueUsers}</div>
            <div className="text-sm text-gray-600">Active Users</div>
          </div>
          <div className="bg-indigo-50 rounded-lg shadow p-4 text-center">
            <div className="text-2xl font-bold text-indigo-600">{stats.uniqueBooks}</div>
            <div className="text-sm text-gray-600">Books in Circulation</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by book title, author, or user email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Actions</option>
                <option value="issue">Issues</option>
                <option value="return">Returns</option>
                <option value="renew">Renewals</option>
              </select>
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Transaction History ({filteredTransactions.length} of {transactions.length})
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
                    User
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
                {filteredTransactions.map((transaction, index) => (
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
                        User ID: {transaction.user_id}
                      </div>
                      <div className="text-sm text-blue-600 font-semibold">
                        Role: {users[transaction.user_id]?.role || 'student'}
                      </div>
                      {/* <div className="text-xs text-gray-400 mt-1">
                        {transaction.user_id.slice(0, 8)}...
                      </div> */}
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

          {filteredTransactions.length === 0 && (
            <div className="px-6 py-12 text-center">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No transactions found</h3>
              <p className="text-gray-600">
                {searchTerm || actionFilter !== 'all'
                  ? 'Try adjusting your search or filter criteria.'
                  : 'No transactions have been recorded yet.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}