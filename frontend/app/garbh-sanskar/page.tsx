'use client'
import { useState } from 'react'
import axios from 'axios'
import { useLanguage } from '@/components/LanguageProvider'

const MONTHS = [
  { num: 1, en: 'Prathamah Masa', hi: 'प्रथम मास',
    guidance: 'Embryo forming. Drink milk with Ashwagandha or Shatavari. Gentle walks only. Avoid spicy food, stress, travel.',
    guidance_hi: 'भ्रूण का निर्माण। अश्वगंधा या शतावरी के साथ दूध पिएं। केवल हल्की सैर करें। मसालेदार भोजन, तनाव और यात्रा से बचें।',
    mantra: 'Garbha Suktam', color: 'border-amber-600/40 bg-amber-900/10' },
  { num: 2, en: 'Dvitiyah Masa', hi: 'द्वितीय मास',
    guidance: 'Heart and limbs forming. Sweet, cold milk with ghee in diet. Listen to Vishnu Sahasranama. Avoid lifting heavy weights.',
    guidance_hi: 'हृदय और अंगों का निर्माण। मीठा ठंडा दूध और घी। विष्णु सहस्रनाम सुनें। भारी वजन उठाने से बचें।',
    mantra: 'Vishnu Sahasranama', color: 'border-sky-600/40 bg-sky-900/10' },
  { num: 3, en: 'Tritiyah Masa', hi: 'तृतीय मास',
    guidance: 'All organs forming. Milk with honey and ghee. Start Garbh Sanskar music — Ragas: Bhairav, Yaman. Avoid anger and grief.',
    guidance_hi: 'सभी अंगों का निर्माण। शहद और घी के साथ दूध। गर्भ संस्कार संगीत — भैरव, यमन राग। क्रोध और शोक से बचें।',
    mantra: 'Raga Bhairav / Yaman', color: 'border-violet-600/40 bg-violet-900/10' },
  { num: 4, en: 'Chaturthah Masa', hi: 'चतुर्थ मास',
    guidance: 'Consciousness (Jiva) enters. Heart fully formed. Pregnant mother may experience cravings (Dauhrida) — fulfill them gently. Begin reading Bhagavad Gita aloud.',
    guidance_hi: 'जीव का प्रवेश। हृदय पूर्ण। दौहृद (इच्छाएं) हो सकती हैं — शांतिपूर्वक पूरी करें। भगवद् गीता का पाठ शुरू करें।',
    mantra: 'Bhagavad Gita recitation', color: 'border-gold-600/40 bg-amber-900/20' },
  { num: 5, en: 'Panchamah Masa', hi: 'पंचम मास',
    guidance: 'Mind and intellect developing. Increase sattvic diet. Listen to classical music. Practice Pranayama gently — Anulom Vilom only.',
    guidance_hi: 'मन और बुद्धि का विकास। सात्विक आहार बढ़ाएं। शास्त्रीय संगीत सुनें। केवल अनुलोम-विलोम प्राणायाम करें।',
    mantra: 'Anulom Vilom Pranayama', color: 'border-green-600/40 bg-green-900/10' },
  { num: 6, en: 'Shashtah Masa', hi: 'षष्ठ मास',
    guidance: 'Body strengthening. Add sesame, rice, milk to diet. Talk to the baby — consciousness is now aware. Recite Gayatri Mantra 108 times daily.',
    guidance_hi: 'शरीर मजबूत हो रहा है। तिल, चावल, दूध आहार में शामिल करें। शिशु से बात करें — वह जागरूक है। गायत्री मंत्र 108 बार दोहराएं।',
    mantra: 'Gayatri Mantra (108×)', color: 'border-saffron-600/40 bg-saffron-900/10' },
  { num: 7, en: 'Saptamah Masa', hi: 'सप्तम मास',
    guidance: 'Baby shifts position. Avoid long travel. Full sattvic diet. Light Abhyanga (oil massage) of abdomen with sesame oil — only after doctor approval.',
    guidance_hi: 'शिशु की स्थिति बदलती है। लंबी यात्रा से बचें। पूर्ण सात्विक आहार। तिल के तेल से पेट की हल्की मालिश — डॉक्टर की अनुमति से।',
    mantra: 'Abhyanga with sesame oil', color: 'border-orange-600/40 bg-orange-900/10' },
  { num: 8, en: 'Ashtamah Masa', hi: 'अष्टम मास',
    guidance: 'Ojas (vital energy) transferring to baby. Do NOT do Abhyanga this month — ojas must stay. Rest completely. Recite Mahamrityunjaya Mantra.',
    guidance_hi: 'ओज का शिशु को हस्तांतरण। इस माह अभ्यंग न करें — ओज रहना चाहिए। पूर्ण विश्राम। महामृत्युंजय मंत्र का जाप करें।',
    mantra: 'Mahamrityunjaya Mantra', color: 'border-red-600/40 bg-red-900/10' },
  { num: 9, en: 'Navamah Masa', hi: 'नवम मास',
    guidance: 'Baby is ready. Warm oil enemas (Anuvasana Basti) prescribed in Charaka Samhita. Light walking only. Prepare birth space with incense and positive sounds.',
    guidance_hi: 'शिशु तैयार है। चरक संहिता में अनुवासन बस्ति (तेल बस्ति) का विधान है। केवल हल्की सैर। प्रसव स्थान को धूप और सकारात्मक ध्वनि से तैयार करें।',
    mantra: 'Positive sounds & incense', color: 'border-teal-600/40 bg-teal-900/10' },
]

const BEST_NAKS = ['Rohini', 'Mrigashira', 'Uttara Phalguni', 'Uttara Ashadha', 'Uttara Bhadrapada', 'Revati', 'Anuradha', 'Hasta', 'Swati']
const GOOD_NAKS = ['Ashwini', 'Punarvasu', 'Shravana', 'Dhanishtha (Padas 1–2)', 'Chitra (Padas 1–2)', 'Vishakha (Padas 1–3)']
const AVOID_NAKS = ['Bharani', 'Krittika', 'Ardra', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Jyeshtha', 'Mula', 'Purva Ashadha', 'Purva Bhadrapada', 'Shatabhisha']

interface NightResult {
  night_num: number
  date: string
  gender_hint: string
  is_even: boolean
  nakshatra: string
  nakshatra_rating: 'best' | 'good' | 'acceptable' | 'avoid'
  tithi: string
  tithi_num: number
  tithi_avoid: boolean
  vara: string
  vara_avoid: boolean
  overall: 'best' | 'good' | 'acceptable' | 'avoid'
  kaal_ratri_slots: Array<{ start: string; end: string }>
  sunrise: string
  sunset: string
}

const RATING_STYLE: Record<string, string> = {
  best:       'border-yellow-600/50 bg-yellow-900/15',
  good:       'border-green-600/40 bg-green-900/10',
  acceptable: 'border-gray-600/40 bg-gray-900/10',
  avoid:      'border-red-600/40 bg-red-900/15 opacity-70',
}

const RATING_LABEL_KEY: Record<string, 'ratingBest' | 'ratingGood' | 'ratingOk' | 'ratingAvoid'> = {
  best: 'ratingBest', good: 'ratingGood', acceptable: 'ratingOk', avoid: 'ratingAvoid',
}

const NAK_COLOR: Record<string, string> = {
  best:       'text-yellow-300 bg-yellow-900/30 border-yellow-700/30',
  good:       'text-green-300 bg-green-900/30 border-green-700/30',
  acceptable: 'text-gray-300 bg-gray-900/30 border-gray-700/30',
  avoid:      'text-red-300 bg-red-900/30 border-red-700/30',
}

interface TodayPanchangData {
  nakshatra: { name: string; name_hi: string; pada: number; end_time: string }
  tithi: { name: string; number: number; paksha: string }
  vara: { name: string; name_hi: string }
  choghadiya: { night: Array<{ name: string; start: string; end: string; overlaps: string[] }> }
}

function classifyNak(name: string): 'best' | 'good' | 'acceptable' | 'avoid' {
  const base = name.split('(')[0].trim()
  if (BEST_NAKS.some(n => n === base || base.startsWith(n))) return 'best'
  if (GOOD_NAKS.some(n => base.startsWith(n.split('(')[0].trim()))) return 'good'
  if (AVOID_NAKS.some(n => n === base || base.startsWith(n))) return 'avoid'
  return 'acceptable'
}

const TITHI_AVOID_SET = new Set([1, 4, 6, 8, 9, 12, 14, 15, 30])

function overallRating(
  nak: 'best' | 'good' | 'acceptable' | 'avoid',
  tithiAvoid: boolean,
  varaAvoid: boolean
): 'best' | 'good' | 'acceptable' | 'avoid' {
  if (nak === 'avoid' || varaAvoid || tithiAvoid) return 'avoid'
  if (nak === 'best') return 'best'
  if (nak === 'good') return 'good'
  return 'acceptable'
}

export default function GarbhSanskarPage() {
  const { t, lang } = useLanguage()
  const p = t.garbhSanskar
  const [tab, setTab] = useState<'months' | 'today' | 'garbhadhana' | 'window'>('months')

  // Conception window state
  const [mensesDate, setMensesDate] = useState('')
  const [locationQuery, setLocationQuery] = useState('')
  const [geoResult, setGeoResult] = useState<{ lat: number; lon: number; tz: string; name: string } | null>(null)
  const [windowResults, setWindowResults] = useState<NightResult[] | null>(null)
  const [calcLoading, setCalcLoading] = useState(false)
  const [calcError, setCalcError] = useState('')
  const [geoLoading, setGeoLoading] = useState(false)

  // Today's Guide state
  const [todayLocQuery, setTodayLocQuery] = useState('')
  const [todayGeoResult, setTodayGeoResult] = useState<{ lat: number; lon: number; tz: string; name: string } | null>(null)
  const [todayData, setTodayData] = useState<TodayPanchangData | null>(null)
  const [todayLoading, setTodayLoading] = useState(false)
  const [todayGeoLoading, setTodayGeoLoading] = useState(false)
  const [todayError, setTodayError] = useState('')

  const fetchTodayPanchang = async (lat: number, lon: number, tz: string) => {
    setTodayLoading(true)
    setTodayError('')
    try {
      const today = new Date().toISOString().split('T')[0]
      const { data } = await axios.get(`/api/panchang?lat=${lat}&lon=${lon}&tz=${encodeURIComponent(tz)}&date=${today}`)
      setTodayData(data)
    } catch {
      setTodayError('Failed to fetch panchang data.')
    } finally {
      setTodayLoading(false)
    }
  }

  const searchTodayLocation = async () => {
    if (!todayLocQuery.trim()) return
    setTodayGeoLoading(true)
    setTodayError('')
    try {
      const { data } = await axios.get(`/api/geocode?q=${encodeURIComponent(todayLocQuery)}`)
      setTodayGeoResult({ lat: data.lat, lon: data.lon, tz: data.tz, name: data.name })
      await fetchTodayPanchang(data.lat, data.lon, data.tz)
    } catch {
      setTodayError('Location not found. Try "Mumbai, India".')
    } finally {
      setTodayGeoLoading(false)
    }
  }

  const searchLocation = async () => {
    if (!locationQuery.trim()) return
    setGeoLoading(true)
    try {
      const { data } = await axios.get(`/api/geocode?q=${encodeURIComponent(locationQuery)}`)
      setGeoResult({ lat: data.lat, lon: data.lon, tz: data.tz, name: data.name })
    } catch {
      setCalcError('Location not found. Try "Delhi, India".')
    } finally {
      setGeoLoading(false)
    }
  }

  const calculateWindow = async () => {
    if (!mensesDate) { setCalcError('Enter menses start date.'); return }
    setCalcLoading(true)
    setCalcError('')
    try {
      const payload = {
        menses_start: mensesDate,
        lat: geoResult?.lat ?? 28.6139,
        lon: geoResult?.lon ?? 77.2090,
        tz: geoResult?.tz ?? 'Asia/Kolkata',
      }
      const { data } = await axios.post('/api/garbhadhana-window', payload)
      setWindowResults(data.nights)
    } catch {
      setCalcError('Calculation failed. Check your inputs.')
    } finally {
      setCalcLoading(false)
    }
  }

  const tabStyle = (key: string) =>
    tab === key
      ? 'bg-saffron-600 text-white'
      : 'bg-deepblue-900 border border-saffron-700/30 text-saffron-400 hover:border-gold-400'

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gold-400 mb-2">{p.title}</h1>
        <p className="text-gray-400">{p.subtitle}</p>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        <button onClick={() => setTab('months')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tabStyle('months')}`}>{p.tab1}</button>
        <button onClick={() => setTab('garbhadhana')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tabStyle('garbhadhana')}`}>{p.tab3}</button>
        <button onClick={() => setTab('window')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tabStyle('window')}`}>{p.tab4}</button>
        <button onClick={() => setTab('today')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tabStyle('today')}`}>{p.tab2}</button>
      </div>

      {tab === 'months' && (
        <div className="space-y-4">
          {MONTHS.map(m => (
            <div key={m.num} className={`border rounded-xl p-4 ${m.color}`}>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-deepblue-900/80 border border-saffron-700/30 flex items-center justify-center">
                  <span className="text-gold-400 font-bold">{m.num}</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-gold-400 font-semibold mb-1">
                    {p.month} {m.num} — {lang === 'hi' ? m.hi : m.en}
                  </h3>
                  <p className="text-gray-300 text-sm mb-2">
                    {lang === 'hi' ? m.guidance_hi : m.guidance}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-saffron-400/70 text-xs">🕉</span>
                    <span className="text-saffron-400 text-xs">{m.mantra}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
          <p className="text-gray-600 text-xs italic mt-4">
            Source: Charaka Samhita (Sharirasthana), Ashtanga Hridayam, traditional Ayurvedic practice.
          </p>
        </div>
      )}

      {tab === 'today' && (
        <div className="space-y-5">
          <div className="bg-deepblue-900 border border-saffron-700/30 rounded-xl p-5">
            <h2 className="text-gold-400 font-bold text-lg mb-1">{p.todayGuideTitle}</h2>
            <p className="text-gray-400 text-sm mb-4">{p.enterLocPrompt}</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={todayLocQuery}
                onChange={e => setTodayLocQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && searchTodayLocation()}
                placeholder={p.locationPlaceholder}
                className="flex-1 bg-deepblue-950 border border-saffron-700/40 text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold-400 placeholder-gray-600"
              />
              <button
                onClick={searchTodayLocation}
                disabled={todayGeoLoading || todayLoading}
                className="px-4 py-2 bg-saffron-600 hover:bg-saffron-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
              >
                {todayGeoLoading || todayLoading ? '…' : p.calcBtn}
              </button>
            </div>
            {todayGeoResult && <p className="text-green-400 text-xs mt-2">✓ {todayGeoResult.name}</p>}
            {todayError && <p className="text-red-400 text-sm mt-2">{todayError}</p>}
          </div>

          {todayData && (() => {
            const nakName = todayData.nakshatra.name
            const nakRat = classifyNak(nakName)
            const tithiAvoid = TITHI_AVOID_SET.has(todayData.tithi.number)
            const varaAvoid = todayData.vara.name === 'Tuesday' || todayData.vara.name === 'Saturday'
            const overall = overallRating(nakRat, tithiAvoid, varaAvoid)
            const kaalRatriSlots = todayData.choghadiya.night.filter(s => s.overlaps.includes('kaal_ratri'))

            return (
              <div className="space-y-3">
                <div className={`border rounded-xl p-4 ${RATING_STYLE[overall]}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300 font-medium">{p.overallTonight}</span>
                    <span className={`text-sm font-bold px-3 py-1 rounded-full border ${
                      overall === 'best' ? 'text-yellow-300 border-yellow-600/50 bg-yellow-900/20' :
                      overall === 'good' ? 'text-green-300 border-green-600/50 bg-green-900/20' :
                      overall === 'avoid' ? 'text-red-300 border-red-600/50 bg-red-900/20' :
                      'text-gray-300 border-gray-600/50 bg-gray-900/20'
                    }`}>
                      {p[RATING_LABEL_KEY[overall]]}
                    </span>
                  </div>
                </div>

                <div className="bg-deepblue-900 border border-saffron-700/20 rounded-xl divide-y divide-saffron-700/10">
                  <div className="flex items-center justify-between px-4 py-3">
                    <div>
                      <span className="text-gray-400 text-xs block">{p.nakLabel}</span>
                      <span className={`text-sm font-medium px-2 py-0.5 rounded-full border inline-block mt-0.5 ${NAK_COLOR[nakRat]}`}>
                        {lang === 'hi' ? todayData.nakshatra.name_hi : nakName} (Pada {todayData.nakshatra.pada})
                      </span>
                    </div>
                    <span className={`text-xs font-bold ${
                      nakRat === 'best' ? 'text-yellow-400' :
                      nakRat === 'good' ? 'text-green-400' :
                      nakRat === 'avoid' ? 'text-red-400' : 'text-gray-400'
                    }`}>{p[RATING_LABEL_KEY[nakRat]]}</span>
                  </div>

                  <div className="flex items-center justify-between px-4 py-3">
                    <div>
                      <span className="text-gray-400 text-xs block">{p.tithiLabel}</span>
                      <span className="text-gray-200 text-sm">{todayData.tithi.paksha} {todayData.tithi.name}</span>
                    </div>
                    {tithiAvoid
                      ? <span className="text-red-400 text-xs font-medium">⚠ {p.tithiAvoidNote}</span>
                      : <span className="text-green-400 text-xs font-medium">✓</span>
                    }
                  </div>

                  <div className="flex items-center justify-between px-4 py-3">
                    <div>
                      <span className="text-gray-400 text-xs block">{p.varaLabel}</span>
                      <span className="text-gray-200 text-sm">{lang === 'hi' ? todayData.vara.name_hi : todayData.vara.name}</span>
                    </div>
                    {varaAvoid
                      ? <span className="text-red-400 text-xs font-medium">⚠ {p.varaAvoidNote}</span>
                      : <span className="text-green-400 text-xs font-medium">✓</span>
                    }
                  </div>
                </div>

                {kaalRatriSlots.length > 0 ? (
                  <div className="bg-rose-900/20 border border-rose-700/30 rounded-xl px-4 py-3">
                    <span className="text-rose-400 text-sm font-medium block mb-1">{p.kaalRatriWarn}</span>
                    {kaalRatriSlots.map((s, i) => (
                      <span key={i} className="text-rose-300 text-sm">{s.start} – {s.end}</span>
                    ))}
                  </div>
                ) : (
                  <div className="bg-green-900/10 border border-green-700/20 rounded-xl px-4 py-3">
                    <span className="text-green-400 text-sm">✓ {p.noKaalRatri}</span>
                  </div>
                )}

                <p className="text-gray-600 text-xs italic">⚠ {p.disclaimer}</p>
              </div>
            )
          })()}
        </div>
      )}

      {tab === 'window' && (
        <div className="space-y-5">
          <div className="bg-deepblue-900 border border-saffron-700/30 rounded-xl p-5">
            <h2 className="text-gold-400 font-bold text-lg mb-1">{p.calcTitle}</h2>
            <p className="text-gray-400 text-sm mb-5">{p.calcSubtitle}</p>

            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-saffron-400 text-xs font-medium block mb-1">{p.mensesLabel}</label>
                <input
                  type="date"
                  value={mensesDate}
                  onChange={e => setMensesDate(e.target.value)}
                  className="w-full bg-deepblue-950 border border-saffron-700/40 text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold-400 [color-scheme:dark]"
                />
              </div>
              <div>
                <label className="text-saffron-400 text-xs font-medium block mb-1">{p.locationLabel}</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={locationQuery}
                    onChange={e => setLocationQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && searchLocation()}
                    placeholder={p.locationPlaceholder}
                    className="flex-1 bg-deepblue-950 border border-saffron-700/40 text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold-400 placeholder-gray-600"
                  />
                  <button
                    onClick={searchLocation}
                    disabled={geoLoading}
                    className="px-3 py-2 bg-deepblue-900 border border-saffron-700/40 text-saffron-400 rounded-lg text-sm hover:border-gold-400 transition disabled:opacity-50"
                  >
                    {geoLoading ? '…' : 'Set'}
                  </button>
                </div>
                {geoResult && <p className="text-green-400 text-xs mt-1">✓ {geoResult.name}</p>}
              </div>
            </div>

            {calcError && <p className="text-red-400 text-sm mb-3">{calcError}</p>}

            <button
              onClick={calculateWindow}
              disabled={calcLoading || !mensesDate}
              className="bg-saffron-600 hover:bg-saffron-700 text-white font-medium px-6 py-2 rounded-lg transition disabled:opacity-50"
            >
              {calcLoading ? p.calculating : p.calcBtn}
            </button>
          </div>

          {windowResults && (
            <div className="space-y-3">
              <p className="text-gray-500 text-xs italic">{p.calcNote}</p>
              {windowResults.map(night => (
                <div key={night.night_num} className={`border rounded-xl p-4 ${RATING_STYLE[night.overall]}`}>
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 text-center">
                        <div className="text-gold-400 font-bold text-lg leading-none">{night.night_num}</div>
                        <div className="text-gray-500 text-xs">{p.nightLabel}</div>
                      </div>
                      <div>
                        <div className="text-gray-300 text-sm font-medium">{night.date}</div>
                        <div className={`text-xs font-medium mt-0.5 ${night.is_even ? 'text-blue-300' : 'text-pink-300'}`}>
                          {night.gender_hint}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${NAK_COLOR[night.nakshatra_rating]}`}>
                        {night.nakshatra}
                      </span>
                      <span className="text-gray-400 text-xs">{night.tithi}</span>
                      <span className="text-gray-500 text-xs">{night.vara}</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                        night.overall === 'best' ? 'text-yellow-300 border-yellow-600/50 bg-yellow-900/20' :
                        night.overall === 'good' ? 'text-green-300 border-green-600/50 bg-green-900/20' :
                        night.overall === 'avoid' ? 'text-red-300 border-red-600/50 bg-red-900/20' :
                        'text-gray-300 border-gray-600/50 bg-gray-900/20'
                      }`}>
                        {p[RATING_LABEL_KEY[night.overall]]}
                      </span>
                    </div>
                  </div>

                  {(night.vara_avoid || night.tithi_avoid) && (
                    <div className="mt-2 flex gap-2 flex-wrap">
                      {night.vara_avoid && <span className="text-red-400 text-xs">⚠ {p.varaAvoidNote}</span>}
                      {night.tithi_avoid && <span className="text-red-400 text-xs">⚠ {p.tithiAvoidNote}</span>}
                    </div>
                  )}

                  {night.kaal_ratri_slots.length > 0 && (
                    <div className="mt-2 bg-rose-900/20 border border-rose-700/30 rounded-lg px-3 py-1.5">
                      <span className="text-rose-400 text-xs font-medium">{p.kaalRatriWarn}: </span>
                      {night.kaal_ratri_slots.map((s, i) => (
                        <span key={i} className="text-rose-300 text-xs">{s.start} – {s.end}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              <div className="flex gap-3 flex-wrap mt-2 text-xs text-gray-500">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500 inline-block"></span> Best</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span> Good</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-500 inline-block"></span> Acceptable</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span> Avoid</span>
                <span className="text-blue-300">Blue = Son · Pink = Daughter</span>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'garbhadhana' && (
        <div className="space-y-5">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-deepblue-900 border border-green-700/30 rounded-xl p-4">
              <h3 className="text-green-400 font-semibold mb-2 text-sm">{p.auspiciousDays}</h3>
              <p className="text-gray-200 text-sm">Monday, Wednesday, Thursday, Friday</p>
            </div>
            <div className="bg-deepblue-900 border border-red-700/30 rounded-xl p-4">
              <h3 className="text-red-400 font-semibold mb-2 text-sm">{p.avoidDays}</h3>
              <p className="text-gray-200 text-sm">Tuesday, Saturday (Sunday: traditional debate)</p>
            </div>
            <div className="bg-deepblue-900 border border-green-700/30 rounded-xl p-4">
              <h3 className="text-green-400 font-semibold mb-2 text-sm">{p.auspiciousTithis}</h3>
              <p className="text-gray-200 text-sm">2, 3, 5, 7, 10, 11, 13 (Shukla Paksha preferred)</p>
            </div>
            <div className="bg-deepblue-900 border border-red-700/30 rounded-xl p-4">
              <h3 className="text-red-400 font-semibold mb-2 text-sm">{p.avoidTithis}</h3>
              <p className="text-gray-200 text-sm">1, 4, 6, 8, 9, 12, 14, Amavasya, Purnima</p>
            </div>
          </div>

          <div className="bg-deepblue-900 border border-saffron-700/30 rounded-xl p-5">
            <h3 className="text-gold-400 font-semibold mb-3">Boy / Girl — Charaka Samhita Rule</h3>
            <p className="text-gray-400 text-xs mb-3">{p.nightsNote}</p>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-3">
                <div className="text-blue-300 font-medium text-sm mb-1">{p.boyRule}</div>
                <div className="text-gray-300 text-sm">{p.evenNights}</div>
              </div>
              <div className="bg-pink-900/20 border border-pink-700/30 rounded-lg p-3">
                <div className="text-pink-300 font-medium text-sm mb-1">{p.girlRule}</div>
                <div className="text-gray-300 text-sm">{p.oddNights}</div>
              </div>
            </div>
          </div>

          <div className="bg-deepblue-900 border border-saffron-700/30 rounded-xl p-5">
            <h3 className="text-gold-400 font-semibold mb-4">Nakshatra Classification for Garbhadhana</h3>
            <div className="space-y-3">
              <div>
                <h4 className="text-yellow-400 text-sm font-medium mb-2">⭐ {p.bestNakshatras}</h4>
                <div className="flex flex-wrap gap-1.5">
                  {BEST_NAKS.map(n => <span key={n} className="bg-yellow-900/20 border border-yellow-700/30 text-yellow-300 text-xs px-2 py-0.5 rounded-full">{n}</span>)}
                </div>
              </div>
              <div>
                <h4 className="text-green-400 text-sm font-medium mb-2">✅ {p.goodNakshatras}</h4>
                <div className="flex flex-wrap gap-1.5">
                  {GOOD_NAKS.map(n => <span key={n} className="bg-green-900/20 border border-green-700/30 text-green-300 text-xs px-2 py-0.5 rounded-full">{n}</span>)}
                </div>
              </div>
              <div>
                <h4 className="text-red-400 text-sm font-medium mb-2">❌ {p.avoidNakshatras}</h4>
                <div className="flex flex-wrap gap-1.5">
                  {AVOID_NAKS.map(n => <span key={n} className="bg-red-900/20 border border-red-700/30 text-red-300 text-xs px-2 py-0.5 rounded-full">{n}</span>)}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-deepblue-900/60 border border-saffron-700/20 rounded-xl p-4">
            <p className="text-gray-500 text-xs italic">⚠ {p.disclaimer}</p>
          </div>
        </div>
      )}
    </div>
  )
}
