'use client'
import { useState, useRef, useEffect } from 'react'
import axios from 'axios'

const API = process.env.NEXT_PUBLIC_API_URL

interface Message { role: 'user' | 'assistant'; content: string }

interface Props { chartData: object }

export default function ChatBot({ chartData }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Namaste! I am Jyotish Guru. Ask me anything about your kundali — planetary placements, dashas, yogas, or what specific aspects mean for your life.' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    if (!input.trim() || loading) return
    const userMsg: Message = { role: 'user', content: input }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)
    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }))
      const { data } = await axios.post(`${API}/api/chat`, {
        message: input,
        chart_data: chartData,
        history,
      })
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I could not process that. Try again.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-deepblue-900 border border-saffron-700/30 rounded-xl flex flex-col h-96">
      <div className="border-b border-saffron-700/20 px-4 py-3">
        <h3 className="text-gold-400 font-bold">Chat with Jyotish Guru</h3>
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
        {loading && (
          <div className="flex justify-start">
            <div className="bg-deepblue-950 border border-saffron-700/20 rounded-xl px-4 py-2 text-saffron-400 text-sm animate-pulse">
              Jyotish Guru is thinking...
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
          placeholder="Ask about your kundali..."
          className="flex-1 bg-deepblue-950 border border-saffron-700/30 rounded-lg px-3 py-2 text-sm text-white focus:border-gold-400 focus:outline-none"
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          className="bg-saffron-600 hover:bg-saffron-500 disabled:bg-saffron-900 text-white px-4 py-2 rounded-lg text-sm transition"
        >
          Send
        </button>
      </div>
    </div>
  )
}
