'use client'
import { useLanguage } from './LanguageProvider'
import { useAuth } from './AuthProvider'

interface UpgradeInfo {
  tier: string
  count: number
  limit: number
  month: string
}

interface UpgradePromptProps {
  info: UpgradeInfo
  onDismiss?: () => void
}

export default function UpgradePrompt({ info, onDismiss }: UpgradePromptProps) {
  const { lang } = useLanguage()
  const { user } = useAuth()
  const isHi = lang === 'hi'

  if (user?.isGod) return null

  return (
    <div className="bg-deepblue-900 border border-saffron-600/50 rounded-xl p-6 text-center space-y-4">
      <div className="text-4xl">🔒</div>
      <h3 className="text-gold-400 font-bold text-lg">
        {isHi ? 'मासिक सीमा समाप्त' : 'Monthly limit reached'}
      </h3>
      <p className="text-gray-300 text-sm">
        {isHi
          ? `आपने इस माह ${info.count}/${info.limit} AI अनुरोध उपयोग किए हैं।`
          : `You've used ${info.count} of ${info.limit} AI requests this month.`}
      </p>
      <p className="text-gray-400 text-xs">
        {isHi
          ? `वर्तमान प्लान: ${info.tier === 'free' ? 'निःशुल्क' : info.tier === 'basic' ? 'बेसिक' : 'प्रो'}`
          : `Current plan: ${info.tier.charAt(0).toUpperCase() + info.tier.slice(1)}`}
      </p>
      <a
        href="/pricing"
        className="inline-block bg-saffron-600 hover:bg-saffron-700 text-white font-semibold px-6 py-2.5 rounded-lg transition text-sm"
      >
        {isHi ? 'अपग्रेड करें ✨' : 'Upgrade Plan ✨'}
      </a>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="block mx-auto text-gray-500 hover:text-gray-300 text-xs transition mt-1"
        >
          {isHi ? 'बाद में' : 'Maybe later'}
        </button>
      )}
    </div>
  )
}
