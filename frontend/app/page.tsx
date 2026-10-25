'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import BirthForm from '@/components/BirthForm'
import UploadForm from '@/components/UploadForm'
import { useLanguage } from '@/components/LanguageProvider'

const FEATURE_CARDS = [
  { icon: '📅', href: '/panchang' },
  { icon: '💑', href: '/match' },
  { icon: '🪔', href: '/festivals' },
  { icon: '🤰', href: '/garbh-sanskar' },
  { icon: '🙏', href: '/samskara' },
  { icon: '👶', href: '/baby-names' },
  { icon: '🔮', href: '/varshaphal' },
  { icon: '❓', href: '/prasna' },
  { icon: '📚', href: '/learn' },
]

interface InitialFormValues {
  name?: string
  birth_date?: string
  birth_time?: string
  birth_place?: string
}

function HomeContent() {
  const [mode, setMode] = useState<'choose' | 'generate' | 'upload'>('choose')
  const [initialValues, setInitialValues] = useState<InitialFormValues>({})
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useLanguage()

  useEffect(() => {
    const n = searchParams.get('n')
    const bd = searchParams.get('bd')
    const bt = searchParams.get('bt')
    const bp = searchParams.get('bp')
    if (n || bd || bt || bp) {
      setInitialValues({
        name: n || undefined,
        birth_date: bd || undefined,
        birth_time: bt || undefined,
        birth_place: bp || undefined,
      })
      setMode('generate')
    }
  }, [searchParams])

  const handleChart = (chartData: object) => {
    sessionStorage.setItem('kundali', JSON.stringify(chartData))
    router.push('/chart')
  }

  if (mode === 'generate') return (
    <div className="max-w-xl mx-auto px-4 pt-16">
      <button onClick={() => setMode('choose')} className="text-saffron-400 mb-6 flex items-center gap-2 hover:text-gold-400">
        {t.home.back}
      </button>
      <BirthForm onChart={handleChart} initialValues={initialValues} />
    </div>
  )

  if (mode === 'upload') return (
    <div className="max-w-xl mx-auto px-4 pt-16">
      <button onClick={() => setMode('choose')} className="text-saffron-400 mb-6 flex items-center gap-2 hover:text-gold-400">
        {t.home.back}
      </button>
      <UploadForm onChart={handleChart} />
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto px-4 pt-16 pb-24">
      <div className="text-center mb-16">
        <div className="text-6xl mb-4">🔱</div>
        <h1 className="text-4xl md:text-5xl font-bold text-gold-400 mb-4">Aadya</h1>
        <p className="text-saffron-400 text-lg mb-2">{t.home.subtitle}</p>
        <p className="text-gray-400 max-w-lg mx-auto">{t.home.desc}</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-16">
        <button
          onClick={() => setMode('generate')}
          className="group bg-deepblue-900 border border-saffron-700/40 rounded-2xl p-8 text-left hover:border-gold-400 hover:bg-deepblue-900/80 transition-all"
        >
          <div className="text-4xl mb-4">📅</div>
          <h2 className="text-xl font-bold text-gold-400 mb-2 group-hover:text-gold-300">{t.home.generateTitle}</h2>
          <p className="text-gray-400 text-sm">{t.home.generateDesc}</p>
          <div className="mt-4 text-saffron-400 text-sm font-medium">{t.home.generateCta}</div>
        </button>

        <button
          onClick={() => setMode('upload')}
          className="group bg-deepblue-900 border border-saffron-700/40 rounded-2xl p-8 text-left hover:border-gold-400 hover:bg-deepblue-900/80 transition-all"
        >
          <div className="text-4xl mb-4">📷</div>
          <h2 className="text-xl font-bold text-gold-400 mb-2 group-hover:text-gold-300">{t.home.uploadTitle}</h2>
          <p className="text-gray-400 text-sm">{t.home.uploadDesc}</p>
          <div className="mt-4 text-saffron-400 text-sm font-medium">{t.home.uploadCta}</div>
        </button>
      </div>

      {/* Feature pills */}
      <div className="flex flex-wrap justify-center gap-3 mb-12">
        {[
          { icon: '🏠', idx: 0 }, { icon: '🪐', idx: 1 },
          { icon: '⭐', idx: 2 }, { icon: '⏳', idx: 3 },
        ].map(f => (
          <div key={f.idx} className="bg-deepblue-900/50 border border-saffron-700/20 rounded-full px-4 py-1.5 flex items-center gap-2">
            <span className="text-base">{f.icon}</span>
            <span className="text-gray-300 text-xs">{t.home.features[f.idx]}</span>
          </div>
        ))}
      </div>

      {/* Explore section */}
      <div>
        <h2 className="text-center text-lg font-semibold text-gray-200 mb-6">{t.home.exploreTitle}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {FEATURE_CARDS.map((f, i) => {
            const card = (t.home.featureCards as Array<{name: string; desc: string}>)[i]
            return (
              <a key={f.href} href={f.href}
                className="group bg-deepblue-900 border border-saffron-700/20 rounded-xl p-4 hover:border-gold-400/60 hover:bg-deepblue-800 transition-all">
                <div className="text-2xl mb-2">{f.icon}</div>
                <div className="text-sm font-semibold text-gold-400 group-hover:text-gold-300 mb-1 leading-tight">{card.name}</div>
                <div className="text-xs text-gray-300 leading-snug">{card.desc}</div>
              </a>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64 text-saffron-400">Loading...</div>}>
      <HomeContent />
    </Suspense>
  )
}
