'use client'
import { useState } from 'react'
import axios from 'axios'

const API = process.env.NEXT_PUBLIC_API_URL

interface BirthForm {
  name: string
  birth_date: string
  birth_time: string
  birth_place: string
}

interface Koot {
  name: string
  max: number
  score: number
  meaning: string
  p1?: string
  p2?: string
}

interface MatchResult {
  person1: { name: string; moon_sign: string; nakshatra: string }
  person2: { name: string; moon_sign: string; nakshatra: string }
  koots: Koot[]
  total_score: number
  max_score: number
  percentage: number
  verdict: string
  verdict_color: string
  mangal: { note: string; cancelled: boolean; person1: { has_dosha: boolean }; person2: { has_dosha: boolean } }
}

const emptyForm = (): BirthForm => ({ name: '', birth_date: '', birth_time: '', birth_place: '' })

export default function MatchPage() {
  const [form1, setForm1] = useState<BirthForm>(emptyForm())
  const [form2, setForm2] = useState<BirthForm>(emptyForm())
  const [result, setResult] = useState<MatchResult | null>(null)
  const [interpretation, setInterpretation] = useState('')
  const [loading, setLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [error, setError] = useState('')

  const calculate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setResult(null)
    setInterpretation('')
    try {
      const { data } = await axios.post(`${API}/api/match-charts`, {
        name1: form1.name, birth_date1: form1.birth_date,
        birth_time1: form1.birth_time, birth_place1: form1.birth_place,
        name2: form2.name, birth_date2: form2.birth_date,
        birth_time2: form2.birth_time, birth_place2: form2.birth_place,
      })
      setResult(data)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(msg || 'Failed to calculate compatibility.')
    } finally {
      setLoading(false)
    }
  }

  const getAiReading = async () => {
    if (!result) return
    setAiLoading(true)
    try {
      const { data } = await axios.post(`${API}/api/match-interpret`, result)
      setInterpretation(data.interpretation)
    } finally {
      setAiLoading(false)
    }
  }

  const verdictColor: Record<string, string> = {
    Excellent: 'text-green-400 border-green-400/40 bg-green-400/10',
    Good: 'text-yellow-400 border-yellow-400/40 bg-yellow-400/10',
    Average: 'text-orange-400 border-orange-400/40 bg-orange-400/10',
    'Needs Remedies': 'text-red-400 border-red-400/40 bg-red-400/10',
  }

  const scoreColor = (score: number, max: number) => {
    const pct = score / max
    if (pct >= 0.75) return 'bg-green-500'
    if (pct >= 0.5) return 'bg-yellow-500'
    if (pct >= 0.25) return 'bg-orange-500'
    return 'bg-red-500'
  }

  const BirthInput = ({ form, setForm, label }: { form: BirthForm; setForm: (f: BirthForm) => void; label: string }) => (
    <div className="bg-deepblue-900 border border-saffron-700/30 rounded-xl p-6">
      <h3 className="text-gold-400 font-bold text-lg mb-4">{label}</h3>
      <div className="space-y-3">
        {[
          { key: 'name', label: 'Full Name', type: 'text', placeholder: 'Name' },
          { key: 'birth_date', label: 'Date of Birth', type: 'date', placeholder: '' },
          { key: 'birth_time', label: 'Time of Birth', type: 'time', placeholder: '' },
          { key: 'birth_place', label: 'Place of Birth', type: 'text', placeholder: 'City, Country' },
        ].map(f => (
          <div key={f.key}>
            <label className="block text-saffron-400 text-xs mb-1">{f.label}</label>
            <input
              type={f.type}
              placeholder={f.placeholder}
              required
              value={form[f.key as keyof BirthForm]}
              onChange={e => setForm({ ...form, [f.key]: e.target.value })}
              className="w-full bg-deepblue-950 border border-saffron-700/30 rounded-lg px-3 py-2 text-white text-sm focus:border-gold-400 focus:outline-none"
            />
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="text-center mb-10">
        <div className="text-5xl mb-3">💑</div>
        <h1 className="text-3xl font-bold text-gold-400 mb-2">Kundali Milan</h1>
        <p className="text-gray-400">Ashtakoot compatibility matching — 36-point Vedic system</p>
      </div>

      <form onSubmit={calculate}>
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <BirthInput form={form1} setForm={setForm1} label="Person 1" />
          <BirthInput form={form2} setForm={setForm2} label="Person 2" />
        </div>
        {error && <p className="text-red-400 text-sm mb-4 text-center">{error}</p>}
        <div className="flex justify-center">
          <button
            type="submit"
            disabled={loading}
            className="bg-saffron-600 hover:bg-saffron-500 disabled:bg-saffron-900 text-white font-bold py-3 px-12 rounded-xl transition text-lg"
          >
            {loading ? 'Calculating compatibility...' : 'Match Kundalis'}
          </button>
        </div>
      </form>

      {result && (
        <div className="mt-10 space-y-6">
          {/* Score summary */}
          <div className="bg-deepblue-900 border border-saffron-700/30 rounded-2xl p-8 text-center">
            <div className="flex justify-center gap-12 mb-6">
              <div>
                <div className="text-gold-400 font-bold text-lg">{result.person1.name}</div>
                <div className="text-gray-400 text-sm">{result.person1.moon_sign} Moon</div>
                <div className="text-gray-500 text-xs">{result.person1.nakshatra}</div>
              </div>
              <div className="text-saffron-400 text-3xl self-center">💞</div>
              <div>
                <div className="text-gold-400 font-bold text-lg">{result.person2.name}</div>
                <div className="text-gray-400 text-sm">{result.person2.moon_sign} Moon</div>
                <div className="text-gray-500 text-xs">{result.person2.nakshatra}</div>
              </div>
            </div>

            <div className="text-7xl font-bold text-gold-400 mb-2">
              {result.total_score}<span className="text-3xl text-gray-500">/36</span>
            </div>
            <div className={`inline-block border rounded-full px-6 py-2 text-lg font-bold mb-2 ${verdictColor[result.verdict] || 'text-gray-400'}`}>
              {result.verdict}
            </div>
            <div className="text-gray-400 text-sm">{result.percentage}% compatibility</div>

            <div className="w-full max-w-sm mx-auto mt-4 bg-deepblue-950 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${scoreColor(result.total_score, 36)}`}
                style={{ width: `${result.percentage}%` }}
              />
            </div>
          </div>

          {/* Mangal Dosha */}
          <div className={`border rounded-xl p-4 text-sm ${
            result.mangal.person1.has_dosha || result.mangal.person2.has_dosha
              ? result.mangal.cancelled
                ? 'border-green-400/30 bg-green-400/5 text-green-400'
                : 'border-orange-400/30 bg-orange-400/5 text-orange-400'
              : 'border-saffron-700/20 bg-deepblue-900/50 text-gray-400'
          }`}>
            <span className="font-semibold">Mangal Dosha: </span>{result.mangal.note}
          </div>

          {/* Koot breakdown */}
          <div className="bg-deepblue-900 border border-saffron-700/30 rounded-xl p-6">
            <h3 className="text-gold-400 font-bold text-lg mb-4">Ashtakoot Breakdown</h3>
            <div className="space-y-3">
              {result.koots.map(k => (
                <div key={k.name} className="flex items-center gap-4">
                  <div className="w-28 text-saffron-400 text-sm font-medium flex-shrink-0">{k.name}</div>
                  <div className="flex-1 bg-deepblue-950 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${scoreColor(k.score, k.max)}`}
                      style={{ width: `${(k.score / k.max) * 100}%` }}
                    />
                  </div>
                  <div className="w-12 text-right text-gray-300 text-sm font-mono">{k.score}/{k.max}</div>
                  <div className="w-48 text-gray-500 text-xs hidden md:block">{k.meaning}</div>
                </div>
              ))}
              <div className="flex items-center gap-4 pt-2 border-t border-saffron-700/20">
                <div className="w-28 text-gold-400 text-sm font-bold">Total</div>
                <div className="flex-1" />
                <div className="w-12 text-right text-gold-400 font-bold">{result.total_score}/36</div>
              </div>
            </div>
          </div>

          {/* AI Reading */}
          <div className="bg-deepblue-900 border border-saffron-700/30 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gold-400 font-bold text-lg">AI Compatibility Reading</h3>
              {!interpretation && (
                <button
                  onClick={getAiReading}
                  disabled={aiLoading}
                  className="bg-saffron-700 hover:bg-saffron-600 disabled:bg-saffron-900 text-white text-sm py-2 px-4 rounded-lg transition"
                >
                  {aiLoading ? 'Reading stars...' : 'Get Full Reading'}
                </button>
              )}
            </div>
            {aiLoading && <p className="text-saffron-400 text-sm animate-pulse">Jyotish Guru is reading the compatibility...</p>}
            {interpretation && (
              <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">
                {interpretation}
              </div>
            )}
            {!interpretation && !aiLoading && (
              <p className="text-gray-500 text-sm">Click &quot;Get Full Reading&quot; for a detailed AI compatibility analysis combining Parashari and Bhrigu Samhita frameworks.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
