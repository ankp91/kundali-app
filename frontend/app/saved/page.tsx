'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface SavedKundali {
  id: string
  name: string
  date: string
  place: string
  savedAt: string
  chart: Record<string, unknown>
}

export default function SavedPage() {
  const router = useRouter()
  const [saved, setSaved] = useState<SavedKundali[]>([])

  useEffect(() => {
    const raw = localStorage.getItem('saved_kundalis')
    if (raw) {
      try { setSaved(JSON.parse(raw)) } catch { setSaved([]) }
    }
  }, [])

  const handleLoad = (kundali: SavedKundali) => {
    sessionStorage.setItem('kundali', JSON.stringify(kundali.chart))
    router.push('/chart')
  }

  const handleDelete = (id: string) => {
    const updated = saved.filter(k => k.id !== id)
    setSaved(updated)
    localStorage.setItem('saved_kundalis', JSON.stringify(updated))
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => router.push('/')} className="text-saffron-400 hover:text-gold-400">← Home</button>
        <h1 className="text-2xl font-bold text-gold-400">Saved Kundalis</h1>
      </div>
      {saved.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <div className="text-4xl mb-4">🔱</div>
          <p>No saved kundalis yet.</p>
          <p className="text-sm mt-2">Generate a chart and click &quot;Save Chart&quot; to save it here.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {saved.map(k => (
            <div key={k.id} className="bg-deepblue-900 border border-saffron-700/30 rounded-xl p-5 flex items-center gap-4">
              <div className="text-2xl">🔱</div>
              <div className="flex-1">
                <div className="text-gold-400 font-bold text-lg">{k.name}</div>
                <div className="text-gray-400 text-sm">{k.date} · {k.place}</div>
                <div className="text-gray-600 text-xs mt-1">Saved {new Date(k.savedAt).toLocaleDateString()}</div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleLoad(k)}
                  className="px-4 py-2 bg-saffron-700/20 border border-saffron-600/40 text-saffron-400 hover:text-gold-400 hover:border-gold-400 rounded-lg text-sm transition"
                >
                  Load Chart
                </button>
                <button
                  onClick={() => handleDelete(k.id)}
                  className="px-3 py-2 text-gray-600 hover:text-red-400 rounded-lg text-sm transition"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
