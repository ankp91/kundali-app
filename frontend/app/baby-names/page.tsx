'use client'
import { useState } from 'react'
import { useLanguage } from '@/components/LanguageProvider'

interface Pada { num: number; roman: string; deva: string }
interface NakshatraData {
  index: number; name: string; name_hi: string
  rashi: string; rashi_hi: string; lord: string; lord_hi: string
  padas: Pada[]; names: string[]
}

const NAKSHATRAS: NakshatraData[] = [
  { index: 1, name: 'Ashwini', name_hi: 'अश्विनी', rashi: 'Aries', rashi_hi: 'मेष', lord: 'Ketu', lord_hi: 'केतु',
    padas: [{ num:1, roman:'Chu', deva:'चु' }, { num:2, roman:'Che', deva:'चे' }, { num:3, roman:'Cho', deva:'चो' }, { num:4, roman:'La', deva:'ला' }],
    names: ['Chunky','Chetan','Chesta','Lalit','Lata','Lalima'] },
  { index: 2, name: 'Bharani', name_hi: 'भरणी', rashi: 'Aries', rashi_hi: 'मेष', lord: 'Venus', lord_hi: 'शुक्र',
    padas: [{ num:1, roman:'Li', deva:'ली' }, { num:2, roman:'Lu', deva:'लू' }, { num:3, roman:'Le', deva:'ले' }, { num:4, roman:'Lo', deva:'लो' }],
    names: ['Lilavati','Lila','Luit','Lekha','Lokesh','Lopa'] },
  { index: 3, name: 'Krittika', name_hi: 'कृत्तिका', rashi: 'Taurus', rashi_hi: 'वृषभ', lord: 'Sun', lord_hi: 'सूर्य',
    padas: [{ num:1, roman:'A', deva:'अ' }, { num:2, roman:'I', deva:'इ' }, { num:3, roman:'U', deva:'उ' }, { num:4, roman:'E', deva:'ए' }],
    names: ['Ankit','Ananya','Ishaan','Uma','Esha','Ila','Aditi','Arun'] },
  { index: 4, name: 'Rohini', name_hi: 'रोहिणी', rashi: 'Taurus', rashi_hi: 'वृषभ', lord: 'Moon', lord_hi: 'चंद्र',
    padas: [{ num:1, roman:'O', deva:'ओ' }, { num:2, roman:'Va', deva:'वा' }, { num:3, roman:'Vi', deva:'वि' }, { num:4, roman:'Vu', deva:'वु' }],
    names: ['Ojas','Omkar','Varun','Vani','Vibha','Vishwa','Vandana','Vinay'] },
  { index: 5, name: 'Mrigashira', name_hi: 'मृगशिरा', rashi: 'Gemini', rashi_hi: 'मिथुन', lord: 'Mars', lord_hi: 'मंगल',
    padas: [{ num:1, roman:'Ve', deva:'वे' }, { num:2, roman:'Vo', deva:'वो' }, { num:3, roman:'Ka', deva:'का' }, { num:4, roman:'Ki', deva:'कि' }],
    names: ['Vedant','Veena','Karan','Kavya','Kartik','Kiran','Kirti'] },
  { index: 6, name: 'Ardra', name_hi: 'आर्द्रा', rashi: 'Gemini', rashi_hi: 'मिथुन', lord: 'Rahu', lord_hi: 'राहु',
    padas: [{ num:1, roman:'Ku', deva:'कु' }, { num:2, roman:'Gha', deva:'घ' }, { num:3, roman:'Ng', deva:'ङ' }, { num:4, roman:'Chha', deva:'छ' }],
    names: ['Kunal','Kunjal','Ghana','Chhaya','Chhavi'] },
  { index: 7, name: 'Punarvasu', name_hi: 'पुनर्वसु', rashi: 'Cancer', rashi_hi: 'कर्क', lord: 'Jupiter', lord_hi: 'गुरु',
    padas: [{ num:1, roman:'Ke', deva:'के' }, { num:2, roman:'Ko', deva:'को' }, { num:3, roman:'Ha', deva:'ह' }, { num:4, roman:'Hi', deva:'हि' }],
    names: ['Keshav','Komal','Harsh','Harini','Hiral','Hita'] },
  { index: 8, name: 'Pushya', name_hi: 'पुष्य', rashi: 'Cancer', rashi_hi: 'कर्क', lord: 'Saturn', lord_hi: 'शनि',
    padas: [{ num:1, roman:'Hu', deva:'हु' }, { num:2, roman:'He', deva:'हे' }, { num:3, roman:'Ho', deva:'हो' }, { num:4, roman:'Da', deva:'ड' }],
    names: ['Hulesh','Hemant','Hema','Daksh','Damini'] },
  { index: 9, name: 'Ashlesha', name_hi: 'आश्लेषा', rashi: 'Cancer', rashi_hi: 'कर्क', lord: 'Mercury', lord_hi: 'बुध',
    padas: [{ num:1, roman:'Di', deva:'डि' }, { num:2, roman:'Du', deva:'डु' }, { num:3, roman:'De', deva:'डे' }, { num:4, roman:'Do', deva:'डो' }],
    names: ['Dimple','Deepak','Deepti','Dolly'] },
  { index: 10, name: 'Magha', name_hi: 'मघा', rashi: 'Leo', rashi_hi: 'सिंह', lord: 'Ketu', lord_hi: 'केतु',
    padas: [{ num:1, roman:'Ma', deva:'म' }, { num:2, roman:'Mi', deva:'मि' }, { num:3, roman:'Mu', deva:'मु' }, { num:4, roman:'Me', deva:'मे' }],
    names: ['Mahesh','Madhav','Mira','Minal','Mukesh','Meena','Mohan'] },
  { index: 11, name: 'Purva Phalguni', name_hi: 'पूर्व फाल्गुनी', rashi: 'Leo', rashi_hi: 'सिंह', lord: 'Venus', lord_hi: 'शुक्र',
    padas: [{ num:1, roman:'Mo', deva:'मो' }, { num:2, roman:'Ta', deva:'ट' }, { num:3, roman:'Ti', deva:'टि' }, { num:4, roman:'Tu', deva:'टु' }],
    names: ['Mohit','Tara','Tanvi','Tushar','Tanuj'] },
  { index: 12, name: 'Uttara Phalguni', name_hi: 'उत्तर फाल्गुनी', rashi: 'Virgo', rashi_hi: 'कन्या', lord: 'Sun', lord_hi: 'सूर्य',
    padas: [{ num:1, roman:'Te', deva:'टे' }, { num:2, roman:'To', deva:'टो' }, { num:3, roman:'Pa', deva:'प' }, { num:4, roman:'Pi', deva:'पि' }],
    names: ['Tejas','Pallavi','Payal','Piyush','Pratik'] },
  { index: 13, name: 'Hasta', name_hi: 'हस्त', rashi: 'Virgo', rashi_hi: 'कन्या', lord: 'Moon', lord_hi: 'चंद्र',
    padas: [{ num:1, roman:'Pu', deva:'पु' }, { num:2, roman:'Sha', deva:'ष' }, { num:3, roman:'Na', deva:'ण' }, { num:4, roman:'Tha', deva:'ठ' }],
    names: ['Punit','Purva','Shagun','Nakul','Thakur'] },
  { index: 14, name: 'Chitra', name_hi: 'चित्रा', rashi: 'Libra', rashi_hi: 'तुला', lord: 'Mars', lord_hi: 'मंगल',
    padas: [{ num:1, roman:'Pe', deva:'पे' }, { num:2, roman:'Po', deva:'पो' }, { num:3, roman:'Ra', deva:'र' }, { num:4, roman:'Ri', deva:'रि' }],
    names: ['Pema','Radha','Rahul','Riya','Richa','Rishabh'] },
  { index: 15, name: 'Swati', name_hi: 'स्वाती', rashi: 'Libra', rashi_hi: 'तुला', lord: 'Rahu', lord_hi: 'राहु',
    padas: [{ num:1, roman:'Ru', deva:'रु' }, { num:2, roman:'Re', deva:'रे' }, { num:3, roman:'Ro', deva:'रो' }, { num:4, roman:'Ta', deva:'त' }],
    names: ['Rupal','Rekha','Rohit','Tarun','Tanish'] },
  { index: 16, name: 'Vishakha', name_hi: 'विशाखा', rashi: 'Scorpio', rashi_hi: 'वृश्चिक', lord: 'Jupiter', lord_hi: 'गुरु',
    padas: [{ num:1, roman:'Ti', deva:'ति' }, { num:2, roman:'Tu', deva:'तु' }, { num:3, roman:'Te', deva:'ते' }, { num:4, roman:'To', deva:'तो' }],
    names: ['Tina','Tushar','Tej','Toran','Tosha'] },
  { index: 17, name: 'Anuradha', name_hi: 'अनुराधा', rashi: 'Scorpio', rashi_hi: 'वृश्चिक', lord: 'Saturn', lord_hi: 'शनि',
    padas: [{ num:1, roman:'Na', deva:'न' }, { num:2, roman:'Ni', deva:'नि' }, { num:3, roman:'Nu', deva:'नु' }, { num:4, roman:'Ne', deva:'ने' }],
    names: ['Naman','Naina','Nitesh','Neha','Niraj','Neelam'] },
  { index: 18, name: 'Jyeshtha', name_hi: 'ज्येष्ठा', rashi: 'Scorpio', rashi_hi: 'वृश्चिक', lord: 'Mercury', lord_hi: 'बुध',
    padas: [{ num:1, roman:'No', deva:'नो' }, { num:2, roman:'Ya', deva:'य' }, { num:3, roman:'Yi', deva:'यि' }, { num:4, roman:'Yu', deva:'यु' }],
    names: ['Nora','Yash','Yami','Yukta','Yogesh'] },
  { index: 19, name: 'Mula', name_hi: 'मूल', rashi: 'Sagittarius', rashi_hi: 'धनु', lord: 'Ketu', lord_hi: 'केतु',
    padas: [{ num:1, roman:'Ye', deva:'ये' }, { num:2, roman:'Yo', deva:'यो' }, { num:3, roman:'Ba', deva:'भ' }, { num:4, roman:'Bi', deva:'भि' }],
    names: ['Yeshas','Yogita','Bala','Bimal','Bhavna','Bhanu'] },
  { index: 20, name: 'Purva Ashadha', name_hi: 'पूर्वाषाढ़ा', rashi: 'Sagittarius', rashi_hi: 'धनु', lord: 'Venus', lord_hi: 'शुक्र',
    padas: [{ num:1, roman:'Bu', deva:'भू' }, { num:2, roman:'Dha', deva:'धा' }, { num:3, roman:'Bha', deva:'भ' }, { num:4, roman:'Dha', deva:'ढ' }],
    names: ['Bhumika','Dhara','Dharti','Dhruv','Bhanvi'] },
  { index: 21, name: 'Uttara Ashadha', name_hi: 'उत्तराषाढ़ा', rashi: 'Capricorn', rashi_hi: 'मकर', lord: 'Sun', lord_hi: 'सूर्य',
    padas: [{ num:1, roman:'Be', deva:'बे' }, { num:2, roman:'Bo', deva:'बो' }, { num:3, roman:'Ja', deva:'ज' }, { num:4, roman:'Ji', deva:'जि' }],
    names: ['Beena','Boman','Jatin','Jyoti','Jay','Jia'] },
  { index: 22, name: 'Shravana', name_hi: 'श्रवण', rashi: 'Capricorn', rashi_hi: 'मकर', lord: 'Moon', lord_hi: 'चंद्र',
    padas: [{ num:1, roman:'Khi', deva:'खि' }, { num:2, roman:'Khu', deva:'खु' }, { num:3, roman:'Khe', deva:'खे' }, { num:4, roman:'Kho', deva:'खो' }],
    names: ['Khushboo','Khushal','Khushali','Khooshi'] },
  { index: 23, name: 'Dhanishtha', name_hi: 'धनिष्ठा', rashi: 'Aquarius', rashi_hi: 'कुम्भ', lord: 'Mars', lord_hi: 'मंगल',
    padas: [{ num:1, roman:'Ga', deva:'ग' }, { num:2, roman:'Gi', deva:'गि' }, { num:3, roman:'Gu', deva:'गु' }, { num:4, roman:'Ge', deva:'गे' }],
    names: ['Gaurav','Gauri','Girish','Gita','Gunjan','Geeta'] },
  { index: 24, name: 'Shatabhisha', name_hi: 'शतभिषा', rashi: 'Aquarius', rashi_hi: 'कुम्भ', lord: 'Rahu', lord_hi: 'राहु',
    padas: [{ num:1, roman:'Go', deva:'गो' }, { num:2, roman:'Sa', deva:'स' }, { num:3, roman:'Si', deva:'सि' }, { num:4, roman:'Su', deva:'सु' }],
    names: ['Gomati','Sagar','Savita','Simran','Suresh','Sunita'] },
  { index: 25, name: 'Purva Bhadrapada', name_hi: 'पूर्व भाद्रपद', rashi: 'Pisces', rashi_hi: 'मीन', lord: 'Jupiter', lord_hi: 'गुरु',
    padas: [{ num:1, roman:'Se', deva:'से' }, { num:2, roman:'So', deva:'सो' }, { num:3, roman:'Da', deva:'द' }, { num:4, roman:'Di', deva:'दि' }],
    names: ['Seema','Sonal','Daksha','Dinesh','Dipa','Dixit'] },
  { index: 26, name: 'Uttara Bhadrapada', name_hi: 'उत्तर भाद्रपद', rashi: 'Pisces', rashi_hi: 'मीन', lord: 'Saturn', lord_hi: 'शनि',
    padas: [{ num:1, roman:'Du', deva:'दु' }, { num:2, roman:'Tha', deva:'थ' }, { num:3, roman:'Jha', deva:'झ' }, { num:4, roman:'Da', deva:'ञ' }],
    names: ['Durga','Thakshi','Jhanvi','Jhilmil','Damyanti'] },
  { index: 27, name: 'Revati', name_hi: 'रेवती', rashi: 'Pisces', rashi_hi: 'मीन', lord: 'Mercury', lord_hi: 'बुध',
    padas: [{ num:1, roman:'De', deva:'दे' }, { num:2, roman:'Do', deva:'दो' }, { num:3, roman:'Cha', deva:'च' }, { num:4, roman:'Chi', deva:'चि' }],
    names: ['Devika','Dolar','Charu','Chaya','Chirag','Chintamani'] },
]

export default function BabyNamesPage() {
  const { t, lang } = useLanguage()
  const p = t.babyNames
  const [selected, setSelected] = useState<NakshatraData | null>(null)

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gold-400 mb-2">{p.title}</h1>
        <p className="text-gray-400">{p.subtitle}</p>
      </div>

      {selected ? (
        <div>
          <button
            onClick={() => setSelected(null)}
            className="text-saffron-400 hover:text-gold-400 mb-6 flex items-center gap-1 transition"
          >
            ← {p.allNakshatras}
          </button>

          <div className="bg-deepblue-900 border border-gold-400/30 rounded-2xl p-6 mb-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gold-400">
                  {lang === 'hi' ? selected.name_hi : selected.name}
                </h2>
                <p className="text-gray-400 text-sm mt-1">#{selected.index} of 27 Nakshatras</p>
              </div>
              <div className="text-right">
                <div className="text-saffron-400 text-sm">{p.rashi}: <span className="text-gray-200">{lang === 'hi' ? selected.rashi_hi : selected.rashi}</span></div>
                <div className="text-saffron-400 text-sm mt-1">{p.rashiLord}: <span className="text-gray-200">{lang === 'hi' ? selected.lord_hi : selected.lord}</span></div>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-saffron-400 font-medium mb-3 text-sm uppercase tracking-wide">{p.akshar} — {p.pada} by {p.pada}</h3>
              <div className="grid grid-cols-4 gap-3">
                {selected.padas.map(pd => (
                  <div key={pd.num} className="bg-deepblue-950/60 border border-saffron-700/30 rounded-xl p-3 text-center">
                    <div className="text-gray-500 text-xs mb-1">{p.pada} {pd.num}</div>
                    <div className="text-gold-400 text-xl font-bold">{pd.roman}</div>
                    <div className="text-saffron-400 text-lg mt-0.5">{pd.deva}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <h3 className="text-saffron-400 font-medium mb-3 text-sm uppercase tracking-wide">{p.sampleNames}</h3>
              <div className="flex flex-wrap gap-2">
                {selected.names.map(name => (
                  <span key={name} className="bg-saffron-700/20 border border-saffron-600/30 text-saffron-300 px-3 py-1 rounded-full text-sm">
                    {name}
                  </span>
                ))}
              </div>
            </div>

            <p className="text-gray-500 text-xs mt-4 italic border-t border-saffron-700/20 pt-4">
              ✦ {p.note}
            </p>
          </div>
        </div>
      ) : (
        <div>
          <h2 className="text-saffron-400 font-medium mb-4">{p.selectNakshatra}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {NAKSHATRAS.map(n => (
              <button
                key={n.index}
                onClick={() => setSelected(n)}
                className="bg-deepblue-900 border border-saffron-700/30 hover:border-gold-400 hover:bg-deepblue-900/60 rounded-xl p-3 text-left transition group"
              >
                <div className="text-gray-500 text-xs mb-1">#{n.index}</div>
                <div className="text-gold-400 font-semibold text-sm group-hover:text-gold-300">
                  {lang === 'hi' ? n.name_hi : n.name}
                </div>
                <div className="text-gray-500 text-xs mt-0.5">
                  {lang === 'hi' ? n.rashi_hi : n.rashi}
                </div>
                <div className="flex flex-wrap gap-0.5 mt-2">
                  {n.padas.map(pd => (
                    <span key={pd.num} className="text-saffron-400 text-xs bg-saffron-900/20 px-1 rounded">
                      {pd.roman}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
