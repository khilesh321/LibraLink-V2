import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

export default function Resources() {
  const [pdfs, setPdfs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchPdfs()
  }, [])

  const fetchPdfs = async () => {
    try {
      const { data, error } = await supabase.storage
        .from('books')
        .list('pdfs', {
          limit: 100,
          offset: 0,
          sortBy: { column: 'created_at', order: 'desc' }
        })

      if (error) {
        if (error.message.includes('Bucket not found')) {
          throw new Error('The storage bucket does not exist. Please create a bucket named "books" in your Supabase Storage.')
        }
        throw error
      }

      setPdfs(data || [])
    } catch (error) {
      console.error('Error fetching PDFs:', error)
      setError(error.message || 'Failed to load PDFs')
    } finally {
      setLoading(false)
    }
  }

  const downloadPdf = async (fileName) => {
    try {
      // Create a signed URL for download
      const { data: signedUrlData, error } = await supabase.storage
        .from('books')
        .createSignedUrl(`pdfs/${fileName}`, 300) // 5 minutes expiry

      if (error) {
        if (error.message.includes('Bucket not found')) {
          alert('The storage bucket does not exist. Please create a bucket named "books" in your Supabase Storage.')
          return
        }
        throw error
      }

      if (signedUrlData?.signedUrl) {
        // Create a temporary link and trigger download
        const a = document.createElement('a')
        a.href = signedUrlData.signedUrl
        a.download = fileName
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      } else {
        throw new Error('Could not generate download URL')
      }
    } catch (error) {
      console.error('Error downloading PDF:', error)
      alert('Failed to download PDF')
    }
  }

  const readOnline = async (fileName) => {
    try {
      // First try to get a public URL
      const { data: publicUrlData } = supabase.storage
        .from('books')
        .getPublicUrl(`pdfs/${fileName}`)

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
        .createSignedUrl(`pdfs/${fileName}`, 3600) // 1 hour expiry

      if (signedError) {
        if (signedError.message.includes('Bucket not found')) {
          alert('The storage bucket does not exist. Please create a bucket named "books" in your Supabase Storage.')
          return
        }
        throw signedError
      }

      if (signedUrlData?.signedUrl) {
        window.open(signedUrlData.signedUrl, '_blank')
      } else {
        throw new Error('Could not generate access URL')
      }
    } catch (error) {
      console.error('Error reading PDF:', error)
      alert('Failed to open PDF. The file might not exist or you may not have permission to access it.')
    }
  }

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
            <a
              href="/upload"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition duration-200"
            >
              Upload PDF
            </a>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        {pdfs.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📚</div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">No PDFs uploaded yet</h2>
            <p className="text-gray-600 mb-6">Be the first to upload a PDF to the library!</p>
            <a
              href="/upload"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition duration-200"
            >
              Upload Your First PDF
            </a>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {pdfs.map((pdf) => (
              <div key={pdf.name} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center mb-4">
                    <div className="text-red-500 text-2xl mr-3">📄</div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 truncate" title={pdf.name}>
                        {pdf.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {new Date(pdf.created_at).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-500">
                        {(pdf.metadata?.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={() => readOnline(pdf.name)}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm py-2 px-3 rounded transition duration-200"
                    >
                      Read Online
                    </button>
                    <button
                      onClick={() => downloadPdf(pdf.name)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 px-3 rounded transition duration-200"
                    >
                      Download
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}