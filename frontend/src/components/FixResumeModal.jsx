import { useState } from 'react'
import { fixMyResume } from '../api/resumeApi'

export default function FixResumeModal({ resumeText, onClose }) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [copied, setCopied] = useState(false)

  const handleFix = async () => {
    setLoading(true)
    try {
      const res = await fixMyResume(resumeText)
      setResult(res.data.result)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    if (!result?.rewrittenResume) return
    navigator.clipboard.writeText(result.rewrittenResume)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[90vh] glass rounded-[2rem] overflow-hidden flex flex-col shadow-2xl">
        
        {/* Modal Header */}
        <div className="px-8 py-6 border-b border-white/5 bg-white/5 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-display text-white">Full Resume Upgrade</h2>
            <p className="text-sm text-slate-400">Transforming your resume into top 10% quality with Gemini AI</p>
          </div>
          <button onClick={onClose} className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-white/10 text-slate-400 transition-colors">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          {!result ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="text-6xl mb-6 animate-float">🚀</div>
              <h3 className="text-xl font-display text-white mb-4">Ready for a full transformation?</h3>
              <p className="max-w-md text-sm text-slate-400 mb-8 leading-relaxed">
                Our "Fix My Resume" engine will rewrite your entire document, optimizing for ATS, 
                quantifying achievements, and using powerful action verbs.
              </p>
              <button
                onClick={handleFix}
                disabled={loading}
                className="rounded-xl bg-gradient-to-r from-violet-600 to-pink-500 px-8 py-4 text-sm font-bold text-white shadow-xl shadow-violet-900/40 hover:brightness-110 transition disabled:opacity-50"
              >
                {loading ? 'Processing Transformation...' : 'Start Full AI Rewrite'}
              </button>
              {loading && (
                <div className="mt-8 space-y-4 w-full max-w-xs">
                  <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-violet-500 to-pink-500 animate-[progress-fill_3s_ease-in-out_infinite]"></div>
                  </div>
                  <p className="text-xs text-slate-500 animate-pulse">This may take up to 30 seconds...</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-8 animate-slide-up">
              {/* Stats & Key improvements */}
              <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
                  <p className="text-xs uppercase tracking-widest text-slate-500 mb-4">Improvement Score</p>
                  <div className="text-4xl font-bold text-emerald-400">+{result.improvementScore}% <span className="text-sm font-normal text-slate-500 ml-2">Estimated Boost</span></div>
                </div>
                <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
                  <p className="text-xs uppercase tracking-widest text-slate-500 mb-4">Key Enhancements</p>
                  <ul className="space-y-1">
                    {result.keyImprovements?.map((ki, i) => (
                      <li key={i} className="text-sm text-slate-300 flex gap-2"><span className="text-emerald-500">✓</span> {ki}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Rewritten Content */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display text-xl text-white">Your Upgraded Resume</h3>
                  <button
                    onClick={handleCopy}
                    className="rounded-lg bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/20 transition"
                  >
                    {copied ? '✓ Copied to Clipboard' : '📋 Copy All Content'}
                  </button>
                </div>
                <div className="rounded-2xl bg-black/40 border border-white/10 p-8 text-sm leading-relaxed text-slate-300 whitespace-pre-wrap font-mono max-h-[400px] overflow-y-auto custom-scrollbar">
                  {result.rewrittenResume}
                </div>
              </div>

              {/* Changes list */}
              <div>
                <h3 className="font-display text-lg text-white mb-4">Specific Changes Applied</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {result.changesMade?.map((change, i) => (
                    <div key={i} className="flex gap-3 text-sm text-slate-400 p-3 rounded-xl bg-white/5 border border-white/5">
                      <span className="text-violet-400">✨</span> {change}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-8 py-4 border-t border-white/5 bg-white/5 text-right">
          <button onClick={onClose} className="px-6 py-2 text-sm font-medium text-slate-400 hover:text-white transition">Close Overlay</button>
        </div>
      </div>
    </div>
  )
}
