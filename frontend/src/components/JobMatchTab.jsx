import { useState } from 'react'
import { matchJob } from '../api/resumeApi'

export default function JobMatchTab({ resumeText }) {
  const [jobDesc, setJobDesc] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleMatch = async () => {
    if (!jobDesc.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await matchJob(resumeText, jobDesc)
      setResult(res.data.result)
    } catch (err) {
      setError('Matching failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="rounded-[1.5rem] glass p-6">
        <h2 className="font-display text-2xl text-white mb-1">Job Description Matching</h2>
        <p className="text-sm text-slate-400 mb-6">Paste a job description to see how well your resume matches and what's missing.</p>

        <textarea
          value={jobDesc}
          onChange={(e) => setJobDesc(e.target.value)}
          placeholder="Paste job description here..."
          className="w-full h-48 bg-black/20 border border-white/10 rounded-xl p-4 text-sm text-slate-300 focus:outline-none focus:border-cyan-400/50 transition-colors mb-4 resize-none"
        />

        <button
          onClick={handleMatch}
          disabled={loading || !jobDesc.trim() || !resumeText}
          className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 px-6 py-3 text-sm font-bold text-slate-950 shadow-lg transition hover:brightness-110 disabled:opacity-40"
        >
          {loading ? 'Analyzing Fit...' : '🎯 Check Compatibility'}
        </button>

        {!resumeText && (
          <p className="mt-3 text-center text-xs text-rose-400">Please upload a resume first to use this feature.</p>
        )}
      </div>

      {result && (
        <div className="space-y-6 animate-slide-up">
          {/* Match Score */}
          <div className="rounded-[1.5rem] glass p-8 flex flex-col items-center justify-center text-center">
            <div className="text-5xl font-bold text-gradient mb-2">{result.matchPercentage}%</div>
            <p className="text-lg font-display text-white">Compatibility Match</p>
            <p className="mt-4 max-w-lg text-sm text-slate-300">{result.overallVerdict}</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Matched Skills */}
            <div className="rounded-[1.5rem] glass p-6">
              <h3 className="text-emerald-400 font-display text-lg mb-4 flex items-center gap-2">
                <span className="text-xl">✓</span> Matched Skills & Strengths
              </h3>
              <div className="flex flex-wrap gap-2">
                {result.matchedSkills?.map(s => (
                  <span key={s} className="px-3 py-1 rounded-full bg-emerald-400/10 border border-emerald-400/20 text-xs text-emerald-300">{s}</span>
                ))}
              </div>
              <ul className="mt-4 space-y-2">
                {result.strongPoints?.map((p, i) => (
                  <li key={i} className="text-sm text-slate-300 flex gap-2"><span className="text-emerald-500">•</span> {p}</li>
                ))}
              </ul>
            </div>

            {/* Missing Skills */}
            <div className="rounded-[1.5rem] glass p-6">
              <h3 className="text-rose-400 font-display text-lg mb-4 flex items-center gap-2">
                <span className="text-xl">!</span> Missing Requirements
              </h3>
              <div className="flex flex-wrap gap-2">
                {result.missingSkills?.map(s => (
                  <span key={s} className="px-3 py-1 rounded-full bg-rose-400/10 border border-rose-400/20 text-xs text-rose-300">{s}</span>
                ))}
              </div>
              <ul className="mt-4 space-y-2">
                {result.gaps?.map((g, i) => (
                  <li key={i} className="text-sm text-slate-300 flex gap-2"><span className="text-rose-500">•</span> {g}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Suggestions */}
          <div className="rounded-[1.5rem] glass p-6">
            <h3 className="text-cyan-400 font-display text-lg mb-4">How to close the gap</h3>
            <ul className="space-y-3">
              {result.suggestions?.map((s, i) => (
                <li key={i} className="rounded-xl bg-cyan-400/5 border border-cyan-400/10 p-4 text-sm text-slate-200">
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
