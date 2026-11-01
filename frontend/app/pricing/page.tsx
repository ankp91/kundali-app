'use client'
import { useState } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { useLanguage } from '@/components/LanguageProvider'

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open(): void }
  }
}

const PLANS = {
  monthly: [
    {
      id: 'basic-monthly',
      planId: 'plan_Tuj9xovrhpUgRb',
      name: 'Basic',
      nameHi: 'बेसिक',
      price: 199,
      period: '/month',
      periodHi: '/माह',
      features: [
        '20 AI readings/month',
        'Full chart interpretation',
        'Planetary placements',
        'Dasha analysis',
        'Chat with your chart',
      ],
      featuresHi: [
        '20 AI विश्लेषण/माह',
        'पूर्ण कुंडली व्याख्या',
        'ग्रह स्थिति विश्लेषण',
        'दशा विश्लेषण',
        'कुंडली से चैट',
      ],
      highlight: false,
    },
    {
      id: 'pro-monthly',
      planId: 'plan_TukIwxfdbm3Tbd',
      name: 'Pro',
      nameHi: 'प्रो',
      price: 499,
      period: '/month',
      periodHi: '/माह',
      features: [
        'Unlimited AI readings',
        'Everything in Basic',
        'Past Life Karma analysis',
        'Varshaphal (Solar Return)',
        'Prasna (Horary) charts',
        'Shadbala strength analysis',
        'Priority support',
      ],
      featuresHi: [
        'असीमित AI विश्लेषण',
        'बेसिक की सभी सुविधाएं',
        'पूर्व जन्म कर्म विश्लेषण',
        'वर्षफल',
        'प्रश्न कुंडली',
        'षड्बल विश्लेषण',
        'प्राथमिकता सहायता',
      ],
      highlight: true,
    },
  ],
  annual: [
    {
      id: 'basic-annual',
      planId: 'plan_TukJbUTzSoHERD',
      name: 'Basic',
      nameHi: 'बेसिक',
      price: 1499,
      priceMonthly: 125,
      period: '/year',
      periodHi: '/वर्ष',
      features: [
        '20 AI readings/month',
        'Full chart interpretation',
        'Planetary placements',
        'Dasha analysis',
        'Chat with your chart',
      ],
      featuresHi: [
        '20 AI विश्लेषण/माह',
        'पूर्ण कुंडली व्याख्या',
        'ग्रह स्थिति विश्लेषण',
        'दशा विश्लेषण',
        'कुंडली से चैट',
      ],
      highlight: false,
      savings: 'Save ₹889',
      savingsHi: '₹889 बचाएं',
    },
    {
      id: 'pro-annual',
      planId: 'plan_TukKRz7YTcgyvv',
      name: 'Pro',
      nameHi: 'प्रो',
      price: 3999,
      priceMonthly: 333,
      period: '/year',
      periodHi: '/वर्ष',
      features: [
        'Unlimited AI readings',
        'Everything in Basic',
        'Past Life Karma analysis',
        'Varshaphal (Solar Return)',
        'Prasna (Horary) charts',
        'Shadbala strength analysis',
        'Priority support',
      ],
      featuresHi: [
        'असीमित AI विश्लेषण',
        'बेसिक की सभी सुविधाएं',
        'पूर्व जन्म कर्म विश्लेषण',
        'वर्षफल',
        'प्रश्न कुंडली',
        'षड्बल विश्लेषण',
        'प्राथमिकता सहायता',
      ],
      highlight: true,
      savings: 'Save ₹1,989',
      savingsHi: '₹1,989 बचाएं',
    },
  ],
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise(resolve => {
    if (window.Razorpay) { resolve(true); return }
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

export default function PricingPage() {
  const { user } = useAuth()
  const { lang } = useLanguage()
  const isHi = lang === 'hi'
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly')
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const plans = PLANS[billing]

  const handleSubscribe = async (planId: string, planName: string, price: number) => {
    if (!user) {
      window.location.href = '/login?next=/pricing'
      return
    }

    setLoading(planId)
    setError(null)

    try {
      const token = await user.getIdToken()
      const res = await fetch('/api/payments/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ plan_id: planId, customer_email: user.email }),
      })
      if (!res.ok) throw new Error(await res.text())
      const sub = await res.json()

      const loaded = await loadRazorpayScript()
      if (!loaded) throw new Error('Failed to load payment gateway.')

      const rzp = new window.Razorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        subscription_id: sub.id,
        name: 'Aadya Jyotish',
        description: `${planName} Plan`,
        image: '/logo.png',
        prefill: { email: user.email || '' },
        theme: { color: '#d97706' },
        handler: () => {
          window.location.href = '/chart?subscribed=1'
        },
      })
      rzp.open()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Payment failed. Please try again.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold text-gold-400 mb-3">
          {isHi ? '✨ अपना प्लान चुनें' : '✨ Choose Your Plan'}
        </h1>
        <p className="text-gray-400 text-lg">
          {isHi
            ? 'वैदिक ज्योतिष की पूरी शक्ति अनलॉक करें'
            : 'Unlock the full power of Vedic astrology'}
        </p>

        {/* Free tier note */}
        <p className="text-gray-500 text-sm mt-2">
          {isHi ? 'निःशुल्क: प्रति माह 2 AI विश्लेषण' : 'Free plan: 2 AI readings/month'}
        </p>

        {/* Billing toggle */}
        <div className="inline-flex items-center gap-1 bg-deepblue-900 border border-saffron-700/30 rounded-full p-1 mt-6">
          <button
            onClick={() => setBilling('monthly')}
            className={`px-5 py-2 rounded-full text-sm font-medium transition ${
              billing === 'monthly'
                ? 'bg-saffron-600 text-white'
                : 'text-saffron-400 hover:text-gold-400'
            }`}
          >
            {isHi ? 'मासिक' : 'Monthly'}
          </button>
          <button
            onClick={() => setBilling('annual')}
            className={`px-5 py-2 rounded-full text-sm font-medium transition ${
              billing === 'annual'
                ? 'bg-saffron-600 text-white'
                : 'text-saffron-400 hover:text-gold-400'
            }`}
          >
            {isHi ? 'वार्षिक' : 'Annual'}
            <span className="ml-1.5 text-xs bg-green-700/40 text-green-400 border border-green-600/30 px-1.5 py-0.5 rounded-full">
              {isHi ? 'बचाएं' : 'Save'}
            </span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-600/40 text-red-300 rounded-xl px-5 py-3 text-sm text-center mb-6">
          {error}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {plans.map(plan => (
          <div
            key={plan.id}
            className={`relative rounded-2xl border p-7 flex flex-col gap-5 ${
              plan.highlight
                ? 'border-gold-400/60 bg-deepblue-900 shadow-lg shadow-gold-400/10'
                : 'border-saffron-700/30 bg-deepblue-900/60'
            }`}
          >
            {plan.highlight && (
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gold-400 text-deepblue-900 text-xs font-bold px-4 py-1 rounded-full">
                {isHi ? 'सबसे लोकप्रिय' : 'Most Popular'}
              </div>
            )}

            {'savings' in plan && plan.savings && (
              <div className="absolute top-4 right-4 bg-green-700/30 border border-green-600/40 text-green-400 text-xs px-2.5 py-1 rounded-full font-semibold">
                {isHi ? plan.savingsHi : plan.savings}
              </div>
            )}

            <div>
              <h2 className="text-xl font-bold text-gold-400">
                {isHi ? plan.nameHi : plan.name}
              </h2>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-4xl font-bold text-white">₹{plan.price.toLocaleString('en-IN')}</span>
                <span className="text-gray-400 text-sm">{isHi ? plan.periodHi : plan.period}</span>
              </div>
              {'priceMonthly' in plan && plan.priceMonthly && (
                <p className="text-gray-500 text-xs mt-0.5">
                  {isHi ? `₹${plan.priceMonthly}/माह के बराबर` : `≈ ₹${plan.priceMonthly}/month`}
                </p>
              )}
            </div>

            <ul className="space-y-2.5 flex-1">
              {(isHi ? plan.featuresHi : plan.features).map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                  <span className="text-green-400 mt-0.5">✓</span>
                  {f}
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleSubscribe(plan.planId, isHi ? plan.nameHi : plan.name, plan.price)}
              disabled={loading === plan.planId}
              className={`w-full py-3 rounded-xl font-semibold text-sm transition disabled:opacity-60 ${
                plan.highlight
                  ? 'bg-saffron-600 hover:bg-saffron-700 text-white'
                  : 'bg-deepblue-900 border border-saffron-600/50 hover:border-gold-400 text-saffron-400 hover:text-gold-400'
              }`}
            >
              {loading === plan.planId
                ? (isHi ? 'प्रोसेसिंग...' : 'Processing…')
                : (isHi ? 'अभी शुरू करें' : 'Get Started')}
            </button>
          </div>
        ))}
      </div>

      {/* Free plan */}
      <div className="mt-8 bg-deepblue-900/40 border border-saffron-700/20 rounded-xl p-6 text-center">
        <h3 className="text-saffron-400 font-semibold mb-2">
          {isHi ? 'निःशुल्क प्लान' : 'Free Plan'}
        </h3>
        <p className="text-gray-400 text-sm mb-3">
          {isHi
            ? 'बिना किसी भुगतान के शुरू करें — 2 AI विश्लेषण/माह'
            : 'Start for free — 2 AI readings/month included'}
        </p>
        <a href="/" className="text-saffron-400 hover:text-gold-400 text-sm transition underline underline-offset-2">
          {isHi ? 'मुफ्त में आज़माएं →' : 'Try for free →'}
        </a>
      </div>

      {/* Trust badges */}
      <div className="mt-10 grid grid-cols-3 gap-4 text-center text-xs text-gray-500">
        <div>
          <div className="text-2xl mb-1">🔒</div>
          {isHi ? 'सुरक्षित भुगतान' : 'Secure Payment'}
        </div>
        <div>
          <div className="text-2xl mb-1">↩</div>
          {isHi ? '7-दिन वापसी' : '7-day Refund'}
        </div>
        <div>
          <div className="text-2xl mb-1">📱</div>
          {isHi ? 'UPI / कार्ड स्वीकृत' : 'UPI / Card accepted'}
        </div>
      </div>
    </div>
  )
}
