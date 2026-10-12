'use client'
import { useState, useEffect } from 'react'
import axios from 'axios'
import { useLanguage } from '@/components/LanguageProvider'


interface Lesson { id: string; title: string; icon: string; description: string }
interface LessonDetail { id: string; title: string; topics: object[] }

const GARBH_CLASSICAL = `Garbh Sanskar (गर्भ संस्कार) is the ancient Vedic science of educating and nurturing the unborn child. The texts of Charaka Samhita (Sharirasthana Adhyaya) and Ashtanga Hridayam establish that the child's samskaras begin at the moment of Garbhadhana (conception). The mother is the child's first guru.

Through Svadhyaya (sacred study), Sattvic Ahara (pure diet), Mantra Japa, and the right Nakshatra muhurtas, the parents directly shape the Buddhi, Chitta, and Prarabdha karma of the incoming soul. Garbhadhana itself must be performed on an auspicious Nakshatra — Rohini being supreme — on even nights for Putra-kamna.

The Dauhrida (cravings) of the 4th month must be honored as they represent the unborn child's desires. The recitation of Vishnu Sahasranama in months 2–3 and Gayatri Mantra in month 6 are prescribed to develop the child's Sattvic tendencies. In the 8th month, Abhyanga must be stopped as Ojas transfers from mother to child — disrupting this is contraindicated by Charaka.`

const GARBH_MODERN = `Garbh Sanskar is your baby's first school — and you're the teacher, starting from day zero. Ancient Indian science (yes, backed by Charaka Samhita written 2,500 years ago) says your baby's personality, intelligence, and emotional tendencies are shaped in the womb.

Here's what the research and tradition agree on:
✓ Your stress hormones reach your baby — so calm yourself with music, mantras, and good food.
✓ Month 4 is when consciousness enters — this is when your baby becomes truly aware. Honor their cravings.
✓ Talk to your belly daily. Read out loud. Play classical ragas (Bhairav in the morning, Yaman in the evening).
✓ The naming ceremony isn't random — your baby's Nakshatra at birth gives them their sound, their vibration. That's their Naam Akshara.

The goal? A sattvic (calm, intelligent, kind) child. The method is 9 months of intentional parenting before they're even born.`

export default function LearnPage() {
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [selected, setSelected] = useState<LessonDetail | null>(null)
  const [showGarbh, setShowGarbh] = useState(false)
  const [garbhTab, setGarbhTab] = useState<'classical' | 'modern'>('classical')
  const [explanations, setExplanations] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(false)
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)
  const { t, lang } = useLanguage()

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
      language: lang,
    })
    setExplanations(prev => ({ ...prev, [idx]: data.explanation }))
    setLoading(false)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gold-400 mb-2">{t.learn.title}</h1>
      <p className="text-gray-400 mb-8">{t.learn.subtitle}</p>

      {!selected && !showGarbh ? (
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
          <button
            onClick={() => setShowGarbh(true)}
            className="bg-deepblue-900 border border-saffron-700/30 hover:border-gold-400 rounded-xl p-6 text-left transition"
          >
            <div className="text-3xl mb-2">🌸</div>
            <h2 className="text-gold-400 font-bold mb-1">{t.learn.garbhSanskar}</h2>
            <p className="text-gray-400 text-sm">
              {lang === 'hi'
                ? 'चरक संहिता और आयुर्वेद की परंपरा से — गर्भस्थ शिशु के लिए प्राचीन वैदिक ज्ञान'
                : 'Charaka Samhita & Ayurvedic tradition — ancient wisdom for nurturing the unborn child'}
            </p>
          </button>
        </div>
      ) : showGarbh ? (
        <div>
          <button onClick={() => setShowGarbh(false)} className="text-saffron-400 hover:text-gold-400 mb-6">
            {t.learn.back}
          </button>
          <h2 className="text-2xl font-bold text-gold-400 mb-2">{t.learn.garbhSanskar}</h2>
          <p className="text-gray-400 text-sm mb-6">
            {lang === 'hi' ? 'चरक संहिता, अष्टांग हृदयम् — वैदिक परंपरा' : 'Charaka Samhita, Ashtanga Hridayam — Vedic tradition'}
          </p>
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setGarbhTab('classical')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${garbhTab === 'classical' ? 'bg-saffron-600 text-white' : 'bg-deepblue-900 border border-saffron-700/30 text-saffron-400 hover:border-gold-400'}`}
            >
              {t.garbhSanskar.classicTab}
            </button>
            <button
              onClick={() => setGarbhTab('modern')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${garbhTab === 'modern' ? 'bg-saffron-600 text-white' : 'bg-deepblue-900 border border-saffron-700/30 text-saffron-400 hover:border-gold-400'}`}
            >
              {t.garbhSanskar.modernTab}
            </button>
          </div>
          <div className="bg-deepblue-900 border border-saffron-700/20 rounded-xl p-6">
            <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">
              {garbhTab === 'classical' ? GARBH_CLASSICAL : GARBH_MODERN}
            </p>
          </div>
          <div className="mt-4 text-center">
            <a href="/garbh-sanskar" className="inline-block bg-saffron-600/20 border border-saffron-600/40 text-saffron-400 hover:text-gold-400 px-5 py-2 rounded-lg text-sm transition">
              → {lang === 'hi' ? 'गर्भ संस्कार मार्गदर्शक खोलें' : 'Open Garbh Sanskar Guide'}
            </a>
          </div>
        </div>
      ) : (
        <div>
          <button onClick={() => setSelected(null)} className="text-saffron-400 hover:text-gold-400 mb-6">
            {t.learn.back}
          </button>
          <h2 className="text-2xl font-bold text-gold-400 mb-6">{selected?.title}</h2>
          <div className="space-y-3">
            {selected?.topics.map((topic, idx) => (
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
                      <p className="text-saffron-400 text-sm animate-pulse">{t.learn.thinking}</p>
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
