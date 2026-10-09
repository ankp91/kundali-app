'use client'
import { useState, useEffect, useCallback } from 'react'

interface TransitEvent {
  date: string
  type: 'ingress' | 'conjunction'
  planet: string
  from_sign?: string
  to_sign?: string
  natal_planet?: string
  orb?: number
  description: string
  significance: 'high' | 'medium' | 'low'
}

const PLANET_EMOJI: Record<string, string> = {
  Sun: '☀️', Moon: '🌙', Mars: '♂️', Mercury: '☿', Jupiter: '♃',
  Venus: '♀', Saturn: '♄', Rahu: '☊', Ketu: '☋',
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function significanceBadge(s: string) {
  if (s === 'high') return 'bg-gold-400/20 text-gold-400 border-gold-400/30'
  if (s === 'medium') return 'bg-saffron-700/20 text-saffron-400 border-saffron-600/30'
  return 'bg-gray-700/40 text-gray-400 border-gray-600/30'
}

function eventTitle(ev: TransitEvent) {
  if (ev.type === 'ingress') return `${ev.planet} enters ${ev.to_sign}`
  return `${ev.planet} conjunct natal ${ev.natal_planet} (${ev.orb?.toFixed(1)}°)`
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`
}

export default function TransitCalendarPanel({ chartData }: { chartData: Record<string, unknown> }) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [events, setEvents] = useState<TransitEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/transit-calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chart_data: chartData, year, month }),
      })
      const data = await res.json()
      setEvents(data.events || [])
    } catch {
      setError('Could not load transit calendar. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [chartData, year, month])

  useEffect(() => { fetchEvents() }, [fetchEvents])

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
  }

  // Group by date
  const grouped: Record<string, TransitEvent[]> = {}
  events.forEach(ev => {
    if (!grouped[ev.date]) grouped[ev.date] = []
    grouped[ev.date].push(ev)
  })
  const sortedDates = Object.keys(grouped).sort()

  return (
    <div className="bg-deepblue-900 border border-saffron-700/30 rounded-xl p-6 space-y-4">
      <div>
        <h3 className="text-gold-400 font-bold text-lg mb-1">📅 Transit Calendar</h3>
        <p className="text-gray-500 text-xs">
          Planetary sign changes (ingresses) and conjunctions with your natal planets this month, with their significance explained.
        </p>
      </div>

      {/* Month selector */}
      <div className="flex items-center gap-3">
        <button
          onClick={prevMonth}
          className="px-3 py-1.5 bg-deepblue-950 border border-saffron-700/30 text-saffron-400 hover:border-gold-400 rounded-lg text-sm transition"
        >
          ◀
        </button>
        <span className="text-gold-400 font-bold flex-1 text-center">
          {MONTHS[month - 1]} {year}
        </span>
        <button
          onClick={nextMonth}
          className="px-3 py-1.5 bg-deepblue-950 border border-saffron-700/30 text-saffron-400 hover:border-gold-400 rounded-lg text-sm transition"
        >
          ▶
        </button>
      </div>

      {/* Events */}
      {loading && (
        <div className="text-center py-8 text-saffron-400 animate-pulse text-sm">Loading transits...</div>
      )}

      {error && !loading && (
        <div className="text-red-400 text-sm text-center py-4">{error}</div>
      )}

      {!loading && !error && sortedDates.length === 0 && (
        <div className="text-gray-500 text-sm text-center py-6">No major transits this month.</div>
      )}

      {!loading && !error && sortedDates.length > 0 && (
        <div className="space-y-3">
          {sortedDates.map(date => (
            <div key={date}>
              <div className="text-saffron-400 text-xs font-bold mb-1.5 flex items-center gap-2">
                <span className="bg-saffron-700/20 px-2 py-0.5 rounded">{formatDate(date)}</span>
              </div>
              <div className="space-y-2">
                {grouped[date].map((ev, i) => (
                  <div key={i} className="bg-deepblue-950/60 border border-saffron-700/20 rounded-lg p-3">
                    <div className="flex items-start gap-2 mb-1">
                      <span className="text-lg leading-none">{PLANET_EMOJI[ev.planet] || '🪐'}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-white text-sm font-medium">{eventTitle(ev)}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded border ${
                            ev.type === 'ingress'
                              ? 'bg-gold-400/10 text-gold-400 border-gold-400/30'
                              : 'bg-saffron-700/20 text-saffron-400 border-saffron-600/30'
                          }`}>
                            {ev.type === 'ingress' ? 'Sign Change' : 'Conjunction'}
                          </span>
                          <span className={`text-xs px-1.5 py-0.5 rounded border ml-auto ${significanceBadge(ev.significance)}`}>
                            {ev.significance}
                          </span>
                        </div>
                        <p className="text-gray-400 text-xs mt-1 leading-relaxed">{ev.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
