'use client'
import { useState } from 'react'
import axios from 'axios'

const API = process.env.NEXT_PUBLIC_API_URL

interface Props { onChart: (data: object) => void }

export default function BirthForm({ onChart }: Props) {
  const [form, setForm] = useState({ name: '', birth_date: '', birth_time: '', birth_place: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { data } = await axios.post(`${API}/api/generate-chart`, form)
      onChart(data)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(msg || 'Failed to generate chart. Check your birth details.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-deepblue-900 border border-saffron-700/40 rounded-2xl p-8">
      <h2 className="text-2xl font-bold text-gold-400 mb-6">Generate Your Kundali</h2>
      <form onSubmit={submit} className="space-y-4">
        {[
          { key: 'name', label: 'Full Name', type: 'text', placeholder: 'Your name' },
          { key: 'birth_date', label: 'Date of Birth', type: 'date', placeholder: '' },
          { key: 'birth_time', label: 'Time of Birth', type: 'time', placeholder: '' },
          { key: 'birth_place', label: 'Place of Birth', type: 'text', placeholder: 'City, Country (e.g. Mumbai, India)' },
        ].map(f => (
          <div key={f.key}>
            <label className="block text-saffron-400 text-sm mb-1">{f.label}</label>
            <input
              type={f.type}
              placeholder={f.placeholder}
              required
              value={form[f.key as keyof typeof form]}
              onChange={e => setForm({ ...form, [f.key]: e.target.value })}
              className="w-full bg-deepblue-950 border border-saffron-700/40 rounded-lg px-4 py-2 text-white focus:border-gold-400 focus:outline-none"
            />
          </div>
        ))}
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-saffron-600 hover:bg-saffron-500 disabled:bg-saffron-800 text-white font-bold py-3 rounded-lg transition"
        >
          {loading ? 'Calculating chart...' : 'Generate Kundali'}
        </button>
      </form>
    </div>
  )
}
