'use client'
import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import axios from 'axios'


interface Props { onChart: (data: object) => void }

export default function UploadForm({ onChart }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fileName, setFileName] = useState('')

  const onDrop = useCallback(async (files: File[]) => {
    const file = files[0]
    if (!file) return
    setFileName(file.name)
    setLoading(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      const { data } = await axios.post(`/api/parse-chart`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      onChart(data)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || ''
      if (msg.includes('personal Anthropic API key') || msg.includes('proxy')) {
        setError('Upload needs a personal Anthropic API key (free at console.anthropic.com). Add it as ANTHROPIC_VISION_API_KEY in backend/.env — or use "Generate from birth details" instead.')
      } else {
        setError(msg || 'Failed to parse chart. Try a clearer image.')
      }
    } finally {
      setLoading(false)
    }
  }, [onChart])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'], 'application/pdf': ['.pdf'] },
    maxFiles: 1,
  })

  return (
    <div className="bg-deepblue-900 border border-saffron-700/40 rounded-2xl p-8">
      <h2 className="text-2xl font-bold text-gold-400 mb-2">Upload Your Kundali</h2>
      <p className="text-gray-400 text-sm mb-6">Supports JPG, PNG, WebP, or PDF. AI will read the planetary positions.</p>
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition ${
          isDragActive ? 'border-gold-400 bg-gold-400/5' : 'border-saffron-700/40 hover:border-saffron-500'
        }`}
      >
        <input {...getInputProps()} />
        {loading ? (
          <div>
            <div className="text-4xl mb-3 animate-spin inline-block">⏳</div>
            <p className="text-saffron-400">AI reading your chart...</p>
          </div>
        ) : (
          <div>
            <div className="text-4xl mb-3">📷</div>
            {fileName ? (
              <p className="text-saffron-400">{fileName}</p>
            ) : (
              <>
                <p className="text-gray-300 mb-1">Drop your kundali here</p>
                <p className="text-gray-500 text-sm">or click to browse</p>
              </>
            )}
          </div>
        )}
      </div>
      {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
    </div>
  )
}
