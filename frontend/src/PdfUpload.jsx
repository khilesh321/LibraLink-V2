import { useState } from 'react'
import { supabase } from './supabaseClient'
import useUserRole from './useUserRole'

export default function PdfUpload() {
  const [file, setFile] = useState(null)
  const [documentName, setDocumentName] = useState('')
  const [flipbookUrl, setFlipbookUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const { role, loading } = useUserRole()

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile)
      // Set initial document name from filename (without extension)
      const nameWithoutExt = selectedFile.name.replace(/\.pdf$/i, '')
      setDocumentName(nameWithoutExt)
      setMessage('')
    } else {
      setFile(null)
      setDocumentName('')
      setMessage('Please select a valid PDF file.')
    }
  }

  const handleUpload = async () => {
    if (!['librarian', 'admin'].includes(role)) {
      setMessage('Access denied. Only librarians and admins can upload documents.')
      return
    }

    if (!file || !documentName.trim()) {
      setMessage('Please select a PDF file and enter a document name.')
      return
    }

    setUploading(true)
    setMessage('')

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}.${fileExt}`
      const filePath = `pdfs/${fileName}`

      // Upload file to storage
      const { data: storageData, error: storageError } = await supabase.storage
        .from('books')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (storageError) {
        throw storageError
      }

      // Save document metadata to database
      const { data: dbData, error: dbError } = await supabase
        .from('documents')
        .insert([
          {
            name: documentName.trim(),
            filename: fileName,
            filepath: filePath,
            size: file.size,
            flipbook_url: flipbookUrl.trim() || null,
            uploaded_by: (await supabase.auth.getUser()).data.user?.id
          }
        ])

      if (dbError) {
        // If database insert fails, try to delete the uploaded file
        await supabase.storage.from('books').remove([filePath])
        throw dbError
      }

      setMessage('PDF uploaded successfully!')
      setFile(null)
      setDocumentName('')
      setFlipbookUrl('')
      // Reset file input
      document.getElementById('pdf-input').value = ''
    } catch (error) {
      console.error('Error uploading PDF:', error)
      setMessage('Error uploading PDF. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-md">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  console.log(role);
  if (!['librarian', 'admin'].includes(role)) {
    return (
      <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-md">
        <div className="text-center">
          <div className="text-red-500 text-4xl mb-4">🚫</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Denied</h3>
          <p className="text-gray-600">Only librarians and admins can upload documents.</p>
          {role === 'student' && (
            <p className="text-sm text-gray-500 mt-2">Your current role: Student</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-xl font-semibold mb-4 text-gray-800">Upload PDF</h3>

      <div className="mb-4">
        <input
          id="pdf-input"
          type="file"
          accept=".pdf"
          onChange={handleFileChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={uploading}
        />
      </div>

      {file && (
        <div className="mb-4">
          <label htmlFor="document-name" className="block text-sm font-medium text-gray-700 mb-2">
            Document Name
          </label>
          <input
            id="document-name"
            type="text"
            value={documentName}
            onChange={(e) => setDocumentName(e.target.value)}
            placeholder="Enter document name"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={uploading}
          />
        </div>
      )}

      {file && (
        <div className="mb-4">
          <label htmlFor="flipbook-url" className="block text-sm font-medium text-gray-700 mb-2">
            FlipHTML5 Flipbook URL (Optional)
          </label>
          <input
            id="flipbook-url"
            type="url"
            value={flipbookUrl}
            onChange={(e) => setFlipbookUrl(e.target.value)}
            placeholder="https://fliphtml5.com/bookcase/xxxxx"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={uploading}
          />
          <p className="text-xs text-gray-500 mt-1">
            Enter your FlipHTML5 flipbook URL for interactive reading experience
          </p>
        </div>
      )}

      {file && (
        <div className="mb-4">
          <p className="text-sm text-gray-600">Selected file: {file.name}</p>
        </div>
      )}

      <button
        onClick={handleUpload}
        disabled={!file || !documentName.trim() || uploading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition duration-200"
      >
        {uploading ? 'Uploading...' : 'Upload PDF'}
      </button>

      {message && (
        <p className={`mt-4 text-sm ${message.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>
          {message}
        </p>
      )}
    </div>
  )
}