import { useState } from 'react'

export default function RewriteTab({ rewrites }) {
  const [copied, setCopied] = useState(null)

  if (!rewrites) return null

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <h2 className="font-display text-2xl text-white mb-2">AI-Rewritten Sections</h2>
      <p className="text-sm text-slate-400 mb-6">ATS-optimized and impact-driven versions of your resume's key sections.</p>

      {['summary', 'experience', 'projects'].map((section) => (
        <div key={section} className="rounded-[1.5rem] glass p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg text-white capitalize">{section}</h3>
            <button
              onClick={() => handleCopy(rewrites[section], section)}
              className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              {copied === section ? '✓ Copied' : '📋 Copy Section'}
            </button>
          </div>
          <div className="rounded-xl bg-black/20 p-5 border border-white/5 whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
            {rewrites[section]}
          </div>
        </div>
      ))}
    </div>
  )
}
