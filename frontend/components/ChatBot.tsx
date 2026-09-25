'use client'
import { useState, useRef, useEffect } from 'react'
import { useLanguage } from './LanguageProvider'


interface Message { role: 'user' | 'assistant'; content: string }
interface Props { chartData: object }

export default function ChatBot({ chartData }: Props) {
  const { t, lang } = useLanguage()
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: t.chat.greeting }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    setMessages([{ role: 'assistant', content: t.chat.greeting }])
  }, [lang, t.chat.greeting])

  const send = async () => {
    if (!input.trim() || loading) return
    const userMsg: Message = { role: 'user', content: input }
    // Build clean history: Anthropic requires first message = user, no empty/error assistant turns
    let foundUser = false
    const history = messages.reduce<{role: string; content: string}[]>((acc, m) => {
      if (m.role === 'user') foundUser = true
      if (!foundUser) return acc
      if (m.role === 'assistant' && (!m.content || m.content === t.chat.error)) return acc
      return [...acc, { role: m.role, content: m.content }]
    }, [])
    setMessages(prev => [...prev, userMsg, { role: 'assistant', content: '' }])
    setInput('')
    setLoading(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input, chart_data: chartData, history, language: lang }),
      })
      if (!res.ok) throw new Error('Chat failed')
      const reader = res.body!.getReader()
      const dec = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = dec.decode(value, { stream: true })
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = {
            role: 'assistant',
            content: updated[updated.length - 1].content + chunk,
          }
          return updated
        })
      }
    } catch {
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = { role: 'assistant', content: t.chat.error }
        return updated
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-deepblue-900 border border-saffron-700/30 rounded-xl flex flex-col h-96">
      <div className="border-b border-saffron-700/20 px-4 py-3">
        <h3 className="text-gold-400 font-bold">{t.chat.title}</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs rounded-xl px-4 py-2 text-sm leading-relaxed ${
              m.role === 'user'
                ? 'bg-saffron-700 text-white'
                : 'bg-deepblue-950 border border-saffron-700/20 text-gray-300'
            }`}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && messages[messages.length - 1]?.content === '' && (
          <div className="flex justify-start">
            <div className="bg-deepblue-950 border border-saffron-700/20 rounded-xl px-4 py-2 text-saffron-400 text-sm animate-pulse">
              {t.chat.thinking}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="border-t border-saffron-700/20 p-3 flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder={t.chat.placeholder}
          className="flex-1 bg-deepblue-950 border border-saffron-700/30 rounded-lg px-3 py-2 text-sm text-white focus:border-gold-400 focus:outline-none"
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          className="bg-saffron-600 hover:bg-saffron-500 disabled:bg-saffron-900 text-white px-4 py-2 rounded-lg text-sm transition"
        >
          {t.chat.send}
        </button>
      </div>
    </div>
  )
}
