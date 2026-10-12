'use client'
import { useState } from 'react'
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

export default function GarbhSanskarPage() {
  const { t, lang } = useLanguage()
  const p = t.garbhSanskar
  const [tab, setTab] = useState<'months' | 'today' | 'garbhadhana'>('months')

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
        <button onClick={() => setTab('today')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tabStyle('today')}`}>{p.tab2}</button>
        <button onClick={() => setTab('garbhadhana')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tabStyle('garbhadhana')}`}>{p.tab3}</button>
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
        <div className="bg-deepblue-900 border border-saffron-700/30 rounded-xl p-8 text-center">
          <div className="text-4xl mb-4">🌸</div>
          <p className="text-gray-400">{p.todayPlaceholder}</p>
          <a href="/panchang" className="inline-block mt-4 text-saffron-400 hover:text-gold-400 text-sm transition">
            → Open Daily Panchang
          </a>
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
