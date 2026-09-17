'use client'
import { useState, useEffect } from 'react'
import axios from 'axios'


interface Lesson { id: string; title: string; icon: string; description: string }
interface LessonDetail { id: string; title: string; topics: object[] }

export default function LearnPage() {
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [selected, setSelected] = useState<LessonDetail | null>(null)
  const [explanations, setExplanations] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(false)
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)

  useEffect(() => {
    axios.get(`/api/lessons`).then(r => setLessons(r.data))
  }, [])

  const openLesson = async (id: string) => {
    const { data } = await axios.get(`/api/lessons/${id}`)
    setSelected(data)
    setExplanations({})
    setExpandedIdx(null)
  }

  const explainTopic = async (idx: number, topic: object) => {
    if (explanations[idx]) { setExpandedIdx(idx); return }
    setExpandedIdx(idx)
    setLoading(true)
    const chart = sessionStorage.getItem('kundali')
    const { data } = await axios.post(`/api/lessons/explain`, {
      lesson_id: selected?.id,
      topic,
      chart_data: chart ? JSON.parse(chart) : null,
    })
    setExplanations(prev => ({ ...prev, [idx]: data.explanation }))
    setLoading(false)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gold-400 mb-2">Learn Jyotish</h1>
      <p className="text-gray-400 mb-8">Master Vedic astrology — from houses and planets to dashas and yogas</p>

      {!selected ? (
        <div className="grid md:grid-cols-2 gap-4">
          {lessons.map(l => (
            <button
              key={l.id}
              onClick={() => openLesson(l.id)}
              className="bg-deepblue-900 border border-saffron-700/30 hover:border-gold-400 rounded-xl p-6 text-left transition"
            >
              <div className="text-3xl mb-2">{l.icon}</div>
              <h2 className="text-gold-400 font-bold mb-1">{l.title}</h2>
              <p className="text-gray-400 text-sm">{l.description}</p>
            </button>
          ))}
        </div>
      ) : (
        <div>
          <button onClick={() => setSelected(null)} className="text-saffron-400 hover:text-gold-400 mb-6">
            ← All Lessons
          </button>
          <h2 className="text-2xl font-bold text-gold-400 mb-6">{selected.title}</h2>
          <div className="space-y-3">
            {selected.topics.map((topic, idx) => (
              <div key={idx} className="bg-deepblue-900 border border-saffron-700/20 rounded-xl overflow-hidden">
                <button
                  onClick={() => explainTopic(idx, topic)}
                  className="w-full text-left px-5 py-4 flex items-center justify-between hover:bg-saffron-700/10 transition"
                >
                  <div className="text-gray-200 text-sm font-medium">
                    {Object.values(topic as Record<string, string>)[0]}
                  </div>
                  <span className="text-saffron-400 text-xs">
                    {expandedIdx === idx ? '▲' : '▼ Explain'}
                  </span>
                </button>
                {expandedIdx === idx && (
                  <div className="px-5 pb-4 border-t border-saffron-700/20">
                    <div className="text-gray-400 text-xs pt-2 pb-2">
                      {Object.entries(topic as Record<string, string>).map(([k, v]) => (
                        <span key={k} className="mr-4"><span className="text-saffron-400">{k}:</span> {String(v)}</span>
                      ))}
                    </div>
                    {loading && expandedIdx === idx ? (
                      <p className="text-saffron-400 text-sm animate-pulse">Jyotish Guru is explaining...</p>
                    ) : (
                      <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">
                        {explanations[idx]}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
