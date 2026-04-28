import { useState, useRef, useEffect } from 'react'
import { chatWithCoach } from '../api/resumeApi'

export default function ChatTab({ resumeText, analysis }) {
  const [messages, setMessages] = useState([
    { role: 'ai', content: "Hi! I'm your Gemini AI Career Coach. I've analyzed your resume—ask me anything! For example: 'How can I improve my project section?' or 'What skills am I missing for a Senior Dev role?'" }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = async (e) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMsg = input
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setLoading(true)

    try {
      const res = await chatWithCoach(resumeText, analysis, userMsg, messages)
      setMessages(prev => [...prev, { role: 'ai', content: res.data.response }])
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', content: "Sorry, I encountered an error processing that request." }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-[600px] rounded-[1.5rem] glass overflow-hidden animate-slide-up">
      {/* Chat Header */}
      <div className="px-6 py-4 border-b border-white/5 bg-white/5">
        <h2 className="font-display text-lg text-white">AI Career Coach</h2>
        <p className="text-xs text-slate-400">Personalized advice based on your resume</p>
      </div>

      {/* Messages Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-4 text-sm leading-relaxed ${m.role === 'user' ? 'chat-user text-white' : 'chat-ai text-slate-200'}`}>
              <div className="whitespace-pre-wrap">{m.content}</div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="chat-ai p-4 flex gap-1">
              <div className="typing-dot h-2 w-2 rounded-full bg-cyan-400/50"></div>
              <div className="typing-dot h-2 w-2 rounded-full bg-cyan-400/50"></div>
              <div className="typing-dot h-2 w-2 rounded-full bg-cyan-400/50"></div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <form onSubmit={handleSend} className="p-4 bg-white/5 border-t border-white/5 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask your career coach..."
          className="flex-1 bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400/50 transition-colors"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="rounded-xl bg-cyan-500 px-5 py-2 text-sm font-bold text-slate-950 transition hover:brightness-110 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  )
}
