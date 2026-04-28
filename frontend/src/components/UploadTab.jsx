import { analyzeResume } from '../api/resumeApi'

export default function UploadTab({ file, setFile, setResumeText, setPipeline, loading, setLoading, error, setError, setTab, pipeline }) {

  const handleUpload = (e) => {
    const f = e.target.files?.[0]
    if (f) { setFile(f); setError('') }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const f = e.dataTransfer.files?.[0]
    if (f) { setFile(f); setError('') }
  }

  const handleAnalyze = async () => {
    if (!file) { setError('Choose a resume file first.'); return }
    setLoading(true); setError(''); setPipeline(null)
    try {
      const res = await analyzeResume(file)
      setResumeText(res.data.resume_text || '')
      setPipeline(res.data.pipeline)
      setTab('analysis')
    } catch (err) {
      const msg = err?.response?.data?.detail
        || (err?.code === 'ERR_NETWORK' ? 'Cannot reach backend. Make sure FastAPI is running on port 8000.' : 'Analysis failed. Check backend logs.')
      setError(msg)
    } finally { setLoading(false) }
  }

  const score = pipeline?.analysis?.score

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      {/* Upload Area */}
      <div className="rounded-[1.5rem] glass p-6">
        <h2 className="font-display text-2xl text-white mb-1">Upload Resume</h2>
        <p className="text-sm text-slate-400 mb-5">PDF, DOCX, TXT, or MD — text-based PDFs work best.</p>

        <label
          className="group flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-cyan-400/20 bg-cyan-400/[0.03] p-8 text-center transition-all hover:border-cyan-300/40 hover:bg-cyan-400/[0.06]"
          onDragOver={e => e.preventDefault()}
          onDrop={handleDrop}
        >
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-2xl shadow-lg transition group-hover:scale-110 group-hover:bg-white/15">
            {file ? '📄' : '↑'}
          </div>
          <p className="font-display text-xl text-white">
            {file ? file.name : 'Drop resume here or click to browse'}
          </p>
          <p className="mt-2 text-sm text-slate-400">
            {file ? `${(file.size / 1024).toFixed(1)} KB` : 'Supports PDF, DOCX, TXT, MD'}
          </p>
          <input type="file" accept=".pdf,.docx,.txt,.md" onChange={handleUpload} className="hidden" />
        </label>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <button
            onClick={handleAnalyze}
            disabled={loading || !file}
            className="flex-1 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 px-6 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-900/20 transition hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed btn-glow"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block h-4 w-4 rounded-full border-2 border-slate-900/30 border-t-slate-900 animate-spin"></span>
                Analyzing with Gemini...
              </span>
            ) : '🔍 Analyze Resume'}
          </button>
          {file && !loading && (
            <button onClick={() => { setFile(null); setPipeline(null); setError('') }}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300 hover:bg-white/10 transition">
              Clear
            </button>
          )}
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-rose-400/25 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
            ⚠ {error}
          </div>
        )}

        {loading && (
          <div className="mt-5 space-y-3">
            <p className="text-xs uppercase tracking-widest text-cyan-300/70 animate-pulse-glow">Running Gemini AI Pipeline...</p>
            {['Extracting text...', 'Analyzing resume...', 'Finding improvements...', 'Rewriting sections...'].map((step, i) => (
              <div key={step} className="flex items-center gap-3 text-sm text-slate-400" style={{ animationDelay: `${i * 0.3}s` }}>
                <div className="h-2 w-2 rounded-full bg-cyan-400/50 animate-pulse-glow" style={{ animationDelay: `${i * 0.4}s` }}></div>
                {step}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Results Preview */}
      <div className="rounded-[1.5rem] glass p-6">
        <h2 className="font-display text-2xl text-white mb-1">Quick Overview</h2>
        <p className="text-sm text-slate-400 mb-5">Results appear here after analysis.</p>

        {!pipeline ? (
          <div className="flex flex-col items-center justify-center min-h-[220px] rounded-2xl border border-dashed border-white/10 p-8 text-center">
            <p className="text-4xl mb-3 opacity-30">📊</p>
            <p className="text-sm text-slate-500">Upload and analyze a resume to see AI-powered insights</p>
          </div>
        ) : (
          <div className="space-y-4 animate-slide-up">
            {/* Score Circle */}
            <div className="flex items-center gap-5">
              <div className="relative flex h-24 w-24 items-center justify-center">
                <svg className="h-24 w-24 -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
                  <circle cx="50" cy="50" r="42" fill="none"
                    stroke={score >= 80 ? '#34d399' : score >= 60 ? '#fbbf24' : '#f87171'}
                    strokeWidth="8" strokeLinecap="round"
                    strokeDasharray={`${(score / 100) * 264} 264`}
                    className="transition-all duration-1000"
                  />
                </svg>
                <span className="absolute text-2xl font-bold text-white">{score}</span>
              </div>
              <div>
                <p className="text-sm text-slate-400">Overall Score</p>
                <p className={`text-lg font-bold ${score >= 80 ? 'text-emerald-400' : score >= 60 ? 'text-amber-400' : 'text-rose-400'}`}>
                  {score >= 80 ? 'Excellent' : score >= 60 ? 'Good — needs work' : 'Needs improvement'}
                </p>
                <p className="text-xs text-slate-500 mt-1">Powered by Gemini AI</p>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Strengths" value={pipeline.analysis?.strengths?.length || 0} color="emerald" />
              <StatCard label="Weaknesses" value={pipeline.analysis?.weaknesses?.length || 0} color="rose" />
              <StatCard label="ATS Issues" value={pipeline.analysis?.atsIssues?.length || 0} color="amber" />
              <StatCard label="Skills Found" value={pipeline.analysis?.detectedSkills?.length || 0} color="cyan" />
            </div>

            {/* Navigate buttons */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button onClick={() => setTab('analysis')} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300 hover:bg-white/10 transition">
                View Full Analysis →
              </button>
              <button onClick={() => setTab('improvements')} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300 hover:bg-white/10 transition">
                See Improvements →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, color }) {
  const colors = {
    emerald: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300',
    rose: 'border-rose-400/20 bg-rose-400/10 text-rose-300',
    amber: 'border-amber-400/20 bg-amber-400/10 text-amber-300',
    cyan: 'border-cyan-400/20 bg-cyan-400/10 text-cyan-300',
  }
  return (
    <div className={`rounded-xl border p-3 ${colors[color]}`}>
      <p className="text-xs uppercase tracking-wider opacity-70">{label}</p>
      <p className="text-xl font-bold mt-1">{value}</p>
    </div>
  )
}
