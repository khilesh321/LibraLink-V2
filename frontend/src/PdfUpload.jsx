import { useState } from 'react'
import { supabase } from './supabaseClient'

export default function PdfUpload() {
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile)
      setMessage('')
    } else {
      setFile(null)
      setMessage('Please select a valid PDF file.')
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    setMessage('')

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}.${fileExt}`
      const filePath = `pdfs/${fileName}`

      const { data, error } = await supabase.storage
        .from('books') // Make sure to create this bucket in Supabase
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        throw error
      }

      setMessage('PDF uploaded successfully!')
      setFile(null)
      // Reset file input
      document.getElementById('pdf-input').value = ''
    } catch (error) {
      console.error('Error uploading PDF:', error)
      setMessage('Error uploading PDF. Please try again.')
    } finally {
      setUploading(false)
    }
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
          <p className="text-sm text-gray-600">Selected: {file.name}</p>
        </div>
      )}

      <button
        onClick={handleUpload}
        disabled={!file || uploading}
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