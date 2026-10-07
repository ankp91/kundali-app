'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import KundaliChart from '@/components/KundaliChart'
import PlanetTable from '@/components/PlanetTable'

export default function VarshaphalPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', birth_date: '', birth_time: '', birth_place: '', year: new Date().getFullYear().toString() })
  const [chart, setChart] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [interpretation, setInterpretation] = useState('')
  const [interpreting, setInterpreting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setChart(null)
    setInterpretation('')
    try {
      const res = await fetch('/api/varshaphal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, year: parseInt(form.year) }),
      })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setChart(data)
    } catch {
      setError('Could not calculate Varshaphal. Check your details.')
    } finally {
      setLoading(false)
    }
  }

  const handleInterpret = async () => {
    if (!chart) return
    setInterpreting(true)
    setInterpretation('')
    const res = await fetch('/api/interpret-varshaphal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chart_data: chart, year: form.year }),
    })
    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      setInterpretation(prev => prev + decoder.decode(value))
    }
    setInterpreting(false)
  }

  const housesNum: Record<number, { sign: string; sign_hindi: string; planets: string[] }> = {}
  if (chart?.houses) {
    Object.entries(chart.houses as Record<string, { sign: string; sign_hindi: string; planets: string[] }>).forEach(
      ([k, v]) => { housesNum[parseInt(k)] = v }
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => router.push('/')} className="text-saffron-400 hover:text-gold-400">← Home</button>
        <h1 className="text-2xl font-bold text-gold-400">Varshaphal — Annual Horoscope</h1>
      </div>
      <p className="text-gray-400 text-sm mb-6">Solar return chart: calculated for the exact moment the Sun returns to its natal position in your chosen year.</p>

      <form onSubmit={handleSubmit} className="bg-deepblue-900 border border-saffron-700/30 rounded-xl p-6 mb-8">
        <div className="grid md:grid-cols-2 gap-4">
          {[
            { key: 'name', label: 'Full Name', type: 'text', placeholder: 'Your name' },
            { key: 'birth_date', label: 'Date of Birth', type: 'date', placeholder: '' },
            { key: 'birth_time', label: 'Time of Birth', type: 'time', placeholder: '' },
            { key: 'birth_place', label: 'Birth Place', type: 'text', placeholder: 'City, Country' },
            { key: 'year', label: 'Solar Return Year', type: 'number', placeholder: new Date().getFullYear().toString() },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-saffron-400 text-sm mb-1">{f.label}</label>
              <input
                type={f.type}
                value={form[f.key as keyof typeof form]}
                onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                required
                className="w-full bg-deepblue-950 border border-saffron-700/40 text-white rounded-lg px-3 py-2 text-sm focus:border-gold-400 focus:outline-none [color-scheme:dark]"
              />
            </div>
          ))}
        </div>
        {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="mt-4 w-full py-3 bg-saffron-600 hover:bg-saffron-500 text-white font-semibold rounded-lg transition disabled:opacity-50"
        >
          {loading ? 'Calculating solar return...' : 'Calculate Varshaphal →'}
        </button>
      </form>

      {chart && (
        <div className="space-y-6">
          <div className="bg-deepblue-900 border border-gold-400/30 rounded-xl p-4 text-center">
            <h2 className="text-gold-400 font-bold text-xl">{form.name} — Solar Return {form.year}</h2>
            <p className="text-gray-400 text-sm mt-1">
              Sun returns to natal position on {(chart as { return_date: string }).return_date} at {(chart as { return_time: string }).return_time}
            </p>
            <p className="text-gray-500 text-xs">{(chart as { return_datetime_utc: string }).return_datetime_utc}</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="flex justify-center">
                <KundaliChart
                  id="varshaphal-chart"
                  houses={housesNum}
                  ascendant={(chart as { ascendant: { sign: string; sign_hindi: string; degree: number } }).ascendant}
                  name={`${form.name} ${form.year}`}
                  size={400}
                  onHouseClick={() => {}}
                  selectedHouse={null}
                />
              </div>
              <div className="bg-deepblue-900 border border-saffron-700/30 rounded-xl p-4">
                <h3 className="text-gold-400 font-bold mb-3">Solar Return Planetary Positions</h3>
                <PlanetTable
                  planets={(chart as { planets: Record<string, { sign: string; sign_hindi: string; house: number; degree: number; nakshatra: string; pada: number; is_retrograde: boolean }> }).planets}
                  onPlanetClick={() => {}}
                  selectedPlanet={null}
                />
              </div>
            </div>

            <div className="bg-deepblue-900 border border-saffron-700/30 rounded-xl p-6">
              <h3 className="text-gold-400 font-bold text-lg mb-2">Annual Forecast</h3>
              {!interpretation && !interpreting && (
                <button
                  onClick={handleInterpret}
                  className="w-full py-3 bg-saffron-700/20 border border-saffron-600/40 text-saffron-400 hover:text-gold-400 hover:border-gold-400 rounded-lg text-sm transition"
                >
                  🔮 Get Varshaphal Reading
                </button>
              )}
              {interpreting && !interpretation && (
                <p className="text-saffron-400 text-sm animate-pulse">Jyotish Guru is reading your solar return...</p>
              )}
              {interpretation && (
                <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{interpretation}</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
