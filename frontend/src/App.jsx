import { useState, useEffect } from 'react'
import { getGeminiStatus } from './api/resumeApi'
import UploadTab from './components/UploadTab'
import AnalysisTab from './components/AnalysisTab'
import ImprovementsTab from './components/ImprovementsTab'
import RewriteTab from './components/RewriteTab'
import ChatTab from './components/ChatTab'
import JobMatchTab from './components/JobMatchTab'
import FixResumeModal from './components/FixResumeModal'

const TABS = [
  { id: 'upload', label: '📄 Upload', icon: '↑' },
  { id: 'analysis', label: '🔍 Analysis', icon: '◎' },
  { id: 'improvements', label: '✍️ Improve', icon: '⚡' },
  { id: 'rewrite', label: '🔄 Rewrite', icon: '✦' },
  { id: 'chat', label: '💬 Coach', icon: '💬' },
  { id: 'jobmatch', label: '🎯 Job Match', icon: '🎯' },
]

export default function App() {
  const [tab, setTab] = useState('upload')
  const [geminiOk, setGeminiOk] = useState(null)
  const [file, setFile] = useState(null)
  const [resumeText, setResumeText] = useState('')
  const [pipeline, setPipeline] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showFix, setShowFix] = useState(false)

  useEffect(() => {
    getGeminiStatus()
      .then(r => setGeminiOk(r.data))
      .catch(() => setGeminiOk({ available: false, message: 'Cannot reach backend' }))
  }, [])

  const hasResults = !!pipeline

  return (
    <div className="bg-app text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-5 lg:px-8">

        {/* Header */}
        <header className="mb-6 rounded-[1.5rem] glass p-5 shadow-2xl shadow-black/30 animate-fade-in">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-cyan-300">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                Powered by Google Gemini
              </p>
              <h1 className="font-display text-3xl leading-tight text-white md:text-4xl">
                <span className="text-gradient">FairLens AI</span> Resume Lab
              </h1>
              <p className="mt-2 max-w-xl text-sm text-slate-400">
                AI-powered resume analysis, ATS optimization, bias detection, career coaching — all free with Google Gemini.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className={`rounded-xl border px-4 py-2.5 text-xs ${geminiOk?.available ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300' : 'border-amber-400/25 bg-amber-400/10 text-amber-300'}`}>
                <span className="font-semibold">{geminiOk === null ? '⏳ Checking...' : geminiOk.available ? '✓ Gemini Connected' : '⚠ Gemini Offline'}</span>
              </div>
              {hasResults && (
                <button
                  onClick={() => setShowFix(true)}
                  className="animate-float rounded-xl bg-gradient-to-r from-violet-600 to-pink-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-violet-900/30 transition hover:shadow-violet-800/40 hover:brightness-110"
                >
                  🚀 Fix My Resume
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Tab Navigation */}
        <nav className="mb-5 flex gap-1 overflow-x-auto rounded-2xl glass p-1.5">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              disabled={t.id !== 'upload' && !hasResults && t.id !== 'jobmatch'}
              className={`flex-shrink-0 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                tab === t.id
                  ? 'bg-white/10 text-cyan-300 shadow-inner'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {/* Tab Content */}
        <main className="flex-1 animate-slide-up" key={tab}>
          {tab === 'upload' && (
            <UploadTab
              file={file}
              setFile={setFile}
              setResumeText={setResumeText}
              setPipeline={setPipeline}
              loading={loading}
              setLoading={setLoading}
              error={error}
              setError={setError}
              setTab={setTab}
              pipeline={pipeline}
            />
          )}
          {tab === 'analysis' && pipeline && (
            <AnalysisTab analysis={pipeline.analysis} scoreExplanation={pipeline.scoreExplanation} />
          )}
          {tab === 'improvements' && pipeline && (
            <ImprovementsTab improvements={pipeline.improvements} />
          )}
          {tab === 'rewrite' && pipeline && (
            <RewriteTab rewrites={pipeline.rewrites} />
          )}
          {tab === 'chat' && (
            <ChatTab resumeText={resumeText} analysis={pipeline?.analysis} />
          )}
          {tab === 'jobmatch' && (
            <JobMatchTab resumeText={resumeText} />
          )}
        </main>

        {/* Footer */}
        <footer className="mt-8 py-4 text-center text-xs text-slate-600">
          FairLens AI v3.0 — Powered by Google Gemini 2.0 Flash · Free & Open Source
        </footer>
      </div>

      {/* Fix My Resume Modal */}
      {showFix && (
        <FixResumeModal resumeText={resumeText} onClose={() => setShowFix(false)} />
      )}
    </div>
  )
}
