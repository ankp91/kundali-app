'use client'
import { useState } from 'react'
import { useLanguage } from '@/components/LanguageProvider'

interface GeoResult { name: string; lat: number; lon: number; tz: string }

interface MuhurtaWindow {
  name: string; start: string; end: string; overlaps: string[]
}

interface SamskaraResult {
  date: string
  vara: string
  tithi: string
  tithi_num: number
  paksha: string
  nakshatra: string
  nakshatra_hi: string
  nak_rating: string
  fixed_nak: boolean
  masa: string
  windows: MuhurtaWindow[]
  score: number
  rating: string
}

interface SamskaraResponse {
  eligible_start: string
  eligible_end: string
  results: SamskaraResult[]
}

function fmtDate(iso: string) {
  const [y, m, d] = iso.split('-')
  const dt = new Date(Number(y), Number(m) - 1, Number(d))
  return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

const RATING_STYLE: Record<string, string> = {
  excellent: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40',
  good:      'bg-gold-400/10 text-gold-400 border border-gold-400/30',
  acceptable:'bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/30',
}

export default function SamskaraPage() {
  const { t } = useLanguage()
  const s = (t as any).samskara

  const [ceremony, setCeremony]   = useState<'annaprashan' | 'mundan'>('annaprashan')
  const [babyDob, setBabyDob]     = useState('')
  const [gender, setGender]       = useState<'boy' | 'girl'>('boy')
  const [locQuery, setLocQuery]   = useState('')
  const [geo, setGeo]             = useState<GeoResult | null>(null)
  const [geoLoading, setGeoLoading] = useState(false)
  const [loading, setLoading]     = useState(false)
  const [data, setData]           = useState<SamskaraResponse | null>(null)
  const [error, setError]         = useState<string | null>(null)

  async function searchLocation() {
    if (!locQuery.trim()) return
    setGeoLoading(true)
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(locQuery)}`)
      const d   = await res.json()
      setGeo(d)
    } catch { setError('Could not find location.') }
    finally { setGeoLoading(false) }
  }

  async function findMuhurta() {
    if (!babyDob || !geo) { setError('Enter baby DOB and location.'); return }
    setLoading(true); setError(null); setData(null)
    try {
      const res = await fetch('/api/samskara-muhurta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baby_dob: babyDob, gender, ceremony,
          lat: geo.lat, lon: geo.lon, tz: geo.tz,
          days_ahead: 120,
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      setData(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch.')
    } finally { setLoading(false) }
  }

  const ratingLabel = (r: string) =>
    r === 'excellent' ? s.ratingExcellent : r === 'good' ? s.ratingGood : s.ratingAcceptable

  return (
    <div className="min-h-screen bg-deepblue-950">
      <div className="max-w-3xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gold-400 mb-2">🙏 {s.pageTitle}</h1>
          <p className="text-gray-300 text-sm">{s.pageSubtitle}</p>
        </div>

        {/* Form */}
        <div className="bg-deepblue-900 rounded-2xl p-6 border border-saffron-700/20 mb-8 space-y-5">

          {/* Ceremony */}
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">{s.ceremony}</label>
            <div className="grid grid-cols-2 gap-3">
              {(['annaprashan', 'mundan'] as const).map(c => (
                <button key={c} onClick={() => setCeremony(c)}
                  className={`py-3 px-4 rounded-xl border text-sm font-medium transition ${
                    ceremony === c
                      ? 'bg-gold-400/20 border-gold-400 text-gold-400'
                      : 'border-saffron-700/30 text-gray-300 hover:border-gold-400/50'
                  }`}>
                  {c === 'annaprashan' ? s.annaprashan : s.mundan}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-300/60 mt-2">
              {ceremony === 'annaprashan' ? s.annaprashanNote : s.mundanNote}
            </p>
          </div>

          {/* Baby DOB */}
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-1">{s.babyDob}</label>
            <input type="date" value={babyDob} onChange={e => setBabyDob(e.target.value)}
              className="w-full bg-deepblue-950 border border-saffron-700/40 rounded-lg px-3 py-2 text-gray-200 text-sm focus:border-gold-400 focus:outline-none [color-scheme:light] dark:[color-scheme:dark]" />
          </div>

          {/* Gender */}
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">{s.gender}</label>
            <div className="flex gap-3">
              {(['boy', 'girl'] as const).map(g => (
                <button key={g} onClick={() => setGender(g)}
                  className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition ${
                    gender === g
                      ? 'bg-saffron-400/20 border-saffron-400 text-saffron-400'
                      : 'border-saffron-700/30 text-gray-300 hover:border-saffron-400/50'
                  }`}>
                  {g === 'boy' ? s.boy : s.girl}
                </button>
              ))}
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-1">{s.locationLabel}</label>
            <div className="flex gap-2">
              <input value={locQuery} onChange={e => setLocQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && searchLocation()}
                placeholder={s.locationPlaceholder}
                className="flex-1 bg-deepblue-950 border border-saffron-700/40 rounded-lg px-3 py-2 text-gray-200 text-sm focus:border-gold-400 focus:outline-none" />
              <button onClick={searchLocation} disabled={geoLoading}
                className="px-4 py-2 bg-saffron-700/30 hover:bg-saffron-700/50 text-saffron-400 rounded-lg text-sm transition">
                {geoLoading ? '...' : '🔍'}
              </button>
            </div>
            {geo && (
              <p className="text-xs text-emerald-400 mt-1">📍 {geo.name}</p>
            )}
          </div>

          {/* Submit */}
          <button onClick={findMuhurta} disabled={loading || !babyDob || !geo}
            className="w-full py-3 bg-gold-400/20 hover:bg-gold-400/30 border border-gold-400/50 text-gold-400 rounded-xl font-semibold transition disabled:opacity-40">
            {loading ? s.searching : s.searchBtn}
          </button>

          {error && <p className="text-red-400 text-sm">{error}</p>}
        </div>

        {/* Results */}
        {data && (
          <div>
            {/* Eligible window */}
            <div className="text-center mb-5">
              <p className="text-sm text-gray-300">
                {s.eligibleWindow}: <span className="text-gold-400 font-medium">{fmtDate(data.eligible_start)}</span>
                {' '}{s.to}{' '}
                <span className="text-gold-400 font-medium">{fmtDate(data.eligible_end)}</span>
              </p>
            </div>

            {data.results.length === 0 && (
              <p className="text-center text-gray-300 text-sm">{s.noResults}</p>
            )}

            <div className="space-y-4">
              {data.results.map((r, i) => (
                <div key={i} className="bg-deepblue-900 rounded-xl border border-saffron-700/20 p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-gold-400 font-bold text-lg">{fmtDate(r.date)}</p>
                      <p className="text-gray-300 text-sm">{r.vara}</p>
                    </div>
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full ${RATING_STYLE[r.rating]}`}>
                      {ratingLabel(r.rating)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm mb-3">
                    <div>
                      <span className="text-gray-300/60">{s.nakshatra}: </span>
                      <span className="text-gray-200">{r.nakshatra}</span>
                      {r.fixed_nak && ceremony === 'mundan' && (
                        <span className="ml-1 text-xs text-emerald-400">{s.fixedNak}</span>
                      )}
                    </div>
                    <div>
                      <span className="text-gray-300/60">{s.tithi}: </span>
                      <span className="text-gray-200">
                        {r.paksha === 'Shukla' ? s.shukla : s.krishna} {r.tithi}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-300/60">{s.masa}: </span>
                      <span className="text-gray-200">{r.masa}</span>
                    </div>
                  </div>

                  {/* Time windows */}
                  <div>
                    <p className="text-xs text-gray-300/60 mb-1">{s.goodWindows}</p>
                    {r.windows.length === 0 ? (
                      <p className="text-xs text-gray-300/50 italic">{s.noWindows}</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {r.windows.map((w, j) => (
                          <span key={j} className="text-xs bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 px-3 py-1 rounded-full">
                            {w.name} · {w.start}–{w.end}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Disclaimer */}
            {data.results.length > 0 && (
              <p className="text-xs text-gray-300/40 text-center mt-6 px-4">{s.disclaimer}</p>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
