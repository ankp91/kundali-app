'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import BirthForm from '@/components/BirthForm'
import UploadForm from '@/components/UploadForm'
import { useLanguage } from '@/components/LanguageProvider'

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
        <h1 className="text-4xl md:text-5xl font-bold text-gold-400 mb-4">Kundali</h1>
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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: '🏠', idx: 0 }, { icon: '🪐', idx: 1 },
          { icon: '⭐', idx: 2 }, { icon: '⏳', idx: 3 },
        ].map(f => (
          <div key={f.idx} className="bg-deepblue-900/50 border border-saffron-700/20 rounded-xl p-4 text-center">
            <div className="text-2xl mb-1">{f.icon}</div>
            <div className="text-gray-400 text-xs">{t.home.features[f.idx]}</div>
          </div>
        ))}
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
