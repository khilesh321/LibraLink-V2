import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import useUserRole from './useUserRole'
import { toast } from 'react-toastify'

export default function Resources() {
  const [pdfs, setPdfs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedFlipbook, setSelectedFlipbook] = useState(null)
  const [readPopup, setReadPopup] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const { role } = useUserRole()

  useEffect(() => {
    fetchPdfs()
  }, [])

  const fetchPdfs = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      setPdfs(data || [])
    } catch (error) {
      console.error('Error fetching PDFs:', error)
      setError('Failed to load documents')
    } finally {
      setLoading(false)
    }
  }

  const downloadPdf = async (doc) => {
    try {
      // Create a signed URL for download
      const { data: signedUrlData, error } = await supabase.storage
        .from('books')
        .createSignedUrl(doc.filepath, 300) // 5 minutes expiry

      if (error) {
        throw error
      }

      if (signedUrlData?.signedUrl) {
        // Fetch the file and create a download link
        const response = await fetch(signedUrlData.signedUrl)
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const blob = await response.blob()
        const url = URL.createObjectURL(blob)

        // Create a temporary link and trigger download
        const a = document.createElement('a')
        a.href = url
        a.download = doc.name + '.pdf'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)

        // Clean up the object URL
        URL.revokeObjectURL(url)
      } else {
        throw new Error('Could not generate download URL')
      }
    } catch (error) {
      console.error('Error downloading PDF:', error)
      toast.error('Failed to download PDF. Please try again.')
    }
  }

  const readOnline = async (doc) => {
    try {
      // First try to get a public URL
      const { data: publicUrlData } = supabase.storage
        .from('books')
        .getPublicUrl(doc.filepath)

      if (publicUrlData?.publicUrl) {
        // Check if the public URL works by making a HEAD request
        const response = await fetch(publicUrlData.publicUrl, { method: 'HEAD' })
        if (response.ok) {
          window.open(publicUrlData.publicUrl, '_blank')
          return
        }
      }

      // If public URL doesn't work, create a signed URL (expires in 1 hour)
      const { data: signedUrlData, error: signedError } = await supabase.storage
        .from('books')
        .createSignedUrl(doc.filepath, 3600) // 1 hour expiry

      if (signedError) {
        throw signedError
      }

      if (signedUrlData?.signedUrl) {
        window.open(signedUrlData.signedUrl, '_blank')
      } else {
        throw new Error('Could not generate access URL')
      }
    } catch (error) {
      console.error('Error reading PDF:', error)
      toast.error('Failed to open PDF. The file might not exist or you may not have permission to access it.')
    }
  }

  const openReadPopup = (doc) => {
    setReadPopup(doc)
  }

  const handleReadOption = async (option) => {
    const doc = readPopup
    setReadPopup(null)

    if (option === 'flipbook') {
      setSelectedFlipbook(doc)
    } else if (option === 'online') {
      await readOnline(doc)
    }
  }

  const handleEditResource = (resourceId) => {
    window.location.href = `/resources/edit/${resourceId}`
  }

  const handleDeleteResource = async (resourceId) => {
    if (!confirm('Are you sure you want to delete this resource? This action cannot be undone.')) {
      return
    }

    try {
      // First, get the resource details to delete the file from storage
      const { data: resource, error: fetchError } = await supabase
        .from('documents')
        .select('filepath')
        .eq('id', resourceId)
        .single()

      if (fetchError) throw fetchError

      // Delete the file from storage
      if (resource?.filepath) {
        await supabase.storage
          .from('books')
          .remove([resource.filepath])
      }

      // Delete the database record
      const { error: deleteError } = await supabase
        .from('documents')
        .delete()
        .eq('id', resourceId)

      if (deleteError) throw deleteError

      toast.success('Resource deleted successfully!')
      fetchPdfs()
    } catch (error) {
      console.error('Error deleting resource:', error)
      toast.error('Failed to delete resource: ' + error.message)
    }
  }

  // Filter PDFs based on search query
  const filteredPdfs = pdfs.filter((pdf) => {
    const query = searchQuery.toLowerCase()
    return (
      pdf.name?.toLowerCase().includes(query) ||
      pdf.description?.toLowerCase().includes(query)
    )
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading resources...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">{error}</p>
          <button
            onClick={fetchPdfs}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">Library Resources</h1>
            {['librarian', 'admin'].includes(role) && (
              <a
                href="/upload"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition duration-200"
              >
                Upload PDF
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-gray-50 border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="max-w-md mx-auto">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search resources by name or description..."
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
                Found {filteredPdfs.length} resource{filteredPdfs.length !== 1 ? 's' : ''} matching "{searchQuery}"
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        {filteredPdfs.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📚</div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              {searchQuery ? 'No resources found' : 'No PDFs uploaded yet'}
            </h2>
            <p className="text-gray-600 mb-6">
              {searchQuery 
                ? `No resources match your search for "${searchQuery}". Try different keywords.`
                : ['librarian', 'admin'].includes(role)
                ? 'Be the first to upload a PDF to the library!'
                : 'No documents available yet.'
              }
            </p>
            {searchQuery ? (
              <button
                onClick={() => setSearchQuery('')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition duration-200"
              >
                Clear Search
              </button>
            ) : (
              ['librarian', 'admin'].includes(role) && (
                <a
                  href="/upload"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition duration-200"
                >
                  Upload Your First PDF
                </a>
              )
            )}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredPdfs.map((pdf) => (
              <div key={pdf.id} className="bg-white group relative rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow md:min-h-[72.5vh] duration-300">
                <div className="w-full bg-gray-200 overflow-hidden">
                  {pdf.cover_image_url ? (
                    <img
                      src={pdf.cover_image_url}
                      alt={pdf.name}
                      className="w-full md:absolute md:group-hover:scale-x-0 mx-auto object-fit transition duration-300"
                    />
                  ) : (
                    <div className="w-full h-64 bg-gray-300 flex items-center justify-center">
                      <span className="text-gray-500 text-4xl">📄</span>
                    </div>
                  )}
                </div>
                <div className={`p-6 ${pdf.cover_image_url && 'md:mt-5'}`}>
                  <div className="flex items-center mb-4">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <h3 className="font-semibold text-gray-900 truncate mr-2" title={pdf.name}>
                          {pdf.name}
                        </h3>
                        {pdf.flipbook_url && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            📖 Flipbook
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        {new Date(pdf.created_at).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-500">
                        {(pdf.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={() => openReadPopup(pdf)}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm py-2 px-3 rounded transition duration-200 flex items-center justify-center"
                    >
                      📖 Read
                    </button>
                    <button
                      onClick={() => downloadPdf(pdf)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 px-3 rounded transition duration-200"
                    >
                      Download
                    </button>
                  </div>

                  {/* Admin/Librarian Actions */}
                  {['librarian', 'admin'].includes(role) && (
                    <div className="flex space-x-2 mt-2 pt-2 border-t border-gray-200">
                      <button
                        onClick={() => handleEditResource(pdf.id)}
                        className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-medium py-2 px-3 rounded transition duration-300"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteResource(pdf.id)}
                        className="flex-1 bg-red-500 hover:bg-red-600 text-white text-sm font-medium py-2 px-3 rounded transition duration-300"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Flipbook Modal */}
      {selectedFlipbook && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">{selectedFlipbook.name}</h3>
              <button
                onClick={() => setSelectedFlipbook(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="p-4">
              <div className="w-full h-[70vh] bg-gray-100 rounded">
                <iframe
                  src={selectedFlipbook.flipbook_url}
                  className="w-full h-full rounded"
                  title={`Flipbook: ${selectedFlipbook.name}`}
                  allowFullScreen
                />
              </div>
              <div className="mt-4 text-center">
                <p className="text-sm text-gray-600">
                  Interactive flipbook powered by FlipHTML5
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Read Options Popup */}
      {readPopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Read Options</h3>
              <button
                onClick={() => setReadPopup(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="p-4 space-y-3">
              {readPopup.flipbook_url && (
                <button
                  onClick={() => handleReadOption('flipbook')}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center space-x-2"
                >
                  <span>📖</span>
                  <span>Read as Flipbook</span>
                </button>
              )}
              <button
                onClick={() => handleReadOption('online')}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center space-x-2"
              >
                <span>🌐</span>
                <span>Read Online</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}