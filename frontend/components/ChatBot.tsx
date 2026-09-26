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
  const [extraChart, setExtraChart] = useState<Record<string, unknown> | null>(null)
  const [extraChartName, setExtraChartName] = useState('')
  const [uploadingChart, setUploadingChart] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    setMessages([{ role: 'assistant', content: t.chat.greeting }])
  }, [lang, t.chat.greeting])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setUploadError('')
    setUploadingChart(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/parse-chart', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Could not parse chart')
      setExtraChart(data)
      const name = (data.name as string) || file.name.replace(/\.[^.]+$/, '')
      setExtraChartName(name)
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploadingChart(false)
    }
  }

  const send = async () => {
    if (!input.trim() || loading) return
    const userMsg: Message = { role: 'user', content: input }
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
      const body: Record<string, unknown> = {
        message: input,
        chart_data: chartData,
        history,
        language: lang,
      }
      if (extraChart) body.extra_chart = extraChart
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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
      setMessages(prev => {
        const updated = [...prev]
        const last = updated[updated.length - 1]
        if (last.role === 'assistant' && !last.content.trim()) {
          updated[updated.length - 1] = { role: 'assistant', content: t.chat.error }
        }
        return updated
      })
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

      {/* Extra chart badge */}
      {(extraChart || uploadingChart || uploadError) && (
        <div className="px-3 pb-1 flex items-center gap-2 text-xs">
          {uploadingChart && (
            <span className="text-saffron-400 animate-pulse">Parsing chart...</span>
          )}
          {extraChart && !uploadingChart && (
            <>
              <span className="bg-saffron-900/50 border border-saffron-700/40 text-saffron-300 px-2 py-1 rounded-full flex items-center gap-1">
                <span>📊</span>
                <span className="max-w-[120px] truncate">{extraChartName}</span>
                <button
                  onClick={() => { setExtraChart(null); setExtraChartName('') }}
                  className="ml-1 text-saffron-500 hover:text-white"
                  title="Remove"
                >✕</button>
              </span>
              <span className="text-gray-500">chart loaded — AI can compare both</span>
            </>
          )}
          {uploadError && !uploadingChart && (
            <span className="text-red-400">{uploadError}</span>
          )}
        </div>
      )}

      <div className="border-t border-saffron-700/20 p-3 flex gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={handleFileChange}
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploadingChart || loading}
          title="Upload another person's kundali"
          className="text-saffron-500 hover:text-gold-400 disabled:text-saffron-900 transition text-lg px-1"
        >
          📎
        </button>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder={extraChart ? `Ask about your chart or ${extraChartName}'s...` : t.chat.placeholder}
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
