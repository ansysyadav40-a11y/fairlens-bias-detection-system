export default function AnalysisTab({ analysis, scoreExplanation }) {
  if (!analysis) return null
  const score = analysis.score || 0
  const bias = analysis.biasDetection || {}

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Score + Summary Row */}
      <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
        {/* Score Gauge */}
        <div className="rounded-[1.5rem] glass p-6 flex flex-col items-center justify-center">
          <div className="relative flex h-36 w-36 items-center justify-center mb-3">
            <svg className="h-36 w-36 -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7" />
              <circle cx="50" cy="50" r="42" fill="none"
                stroke={score >= 80 ? 'url(#green)' : score >= 60 ? 'url(#yellow)' : 'url(#red)'}
                strokeWidth="7" strokeLinecap="round"
                strokeDasharray={`${(score / 100) * 264} 264`}
                style={{ transition: 'stroke-dasharray 1.5s ease' }}
              />
              <defs>
                <linearGradient id="green" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#34d399"/><stop offset="1" stopColor="#059669"/></linearGradient>
                <linearGradient id="yellow" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fbbf24"/><stop offset="1" stopColor="#f59e0b"/></linearGradient>
                <linearGradient id="red" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#f87171"/><stop offset="1" stopColor="#ef4444"/></linearGradient>
              </defs>
            </svg>
            <div className="absolute text-center">
              <span className="text-3xl font-bold text-white">{score}</span>
              <span className="text-sm text-slate-400 block">/100</span>
            </div>
          </div>
          <p className={`text-sm font-semibold ${score >= 80 ? 'text-emerald-400' : score >= 60 ? 'text-amber-400' : 'text-rose-400'}`}>
            {score >= 80 ? '🏆 Excellent Resume' : score >= 60 ? '👍 Good — Room to Grow' : '⚠ Needs Significant Work'}
          </p>
        </div>

        {/* Summary + Score Breakdown */}
        <div className="rounded-[1.5rem] glass p-6">
          <h2 className="font-display text-xl text-white mb-2">AI Summary</h2>
          <p className="text-sm leading-relaxed text-slate-300 mb-4">{analysis.summary}</p>

          {scoreExplanation?.scoreBreakdown && (
            <div className="space-y-2.5">
              <p className="text-xs uppercase tracking-wider text-slate-500">Score Breakdown</p>
              {Object.entries(scoreExplanation.scoreBreakdown).map(([key, val]) => (
                <div key={key} className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 w-40 capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                  <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full rounded-full animate-progress"
                      style={{ width: `${(val / 25) * 100}%`, background: val >= 20 ? '#34d399' : val >= 14 ? '#fbbf24' : '#f87171' }}
                    />
                  </div>
                  <span className="text-xs font-medium text-slate-300 w-10 text-right">{val}/25</span>
                </div>
              ))}
            </div>
          )}

          {scoreExplanation?.quickWins?.length > 0 && (
            <div className="mt-4 rounded-xl border border-cyan-400/15 bg-cyan-400/5 p-3">
              <p className="text-xs font-semibold text-cyan-300 mb-2">⚡ Quick Wins to Boost Score</p>
              <ul className="space-y-1">
                {scoreExplanation.quickWins.map((w, i) => (
                  <li key={i} className="text-xs text-slate-300 flex gap-2"><span className="text-cyan-400">•</span>{w}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Strengths & Weaknesses */}
      <div className="grid gap-5 md:grid-cols-2">
        <div className="rounded-[1.5rem] glass p-6">
          <h3 className="font-display text-lg text-white mb-3 flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-400/15 text-xs text-emerald-400">✓</span>
            Strengths
          </h3>
          <ul className="space-y-2">
            {(analysis.strengths || []).map((s, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-300 rounded-xl bg-emerald-400/5 border border-emerald-400/10 px-3 py-2.5">
                <span className="text-emerald-400 mt-0.5">✓</span>{s}
              </li>
            ))}
            {(!analysis.strengths?.length) && <p className="text-sm text-slate-500">No strengths identified.</p>}
          </ul>
        </div>

        <div className="rounded-[1.5rem] glass p-6">
          <h3 className="font-display text-lg text-white mb-3 flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-rose-400/15 text-xs text-rose-400">!</span>
            Weaknesses
          </h3>
          <ul className="space-y-2">
            {(analysis.weaknesses || []).map((w, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-300 rounded-xl bg-rose-400/5 border border-rose-400/10 px-3 py-2.5">
                <span className="text-rose-400 mt-0.5">!</span>{w}
              </li>
            ))}
            {(!analysis.weaknesses?.length) && <p className="text-sm text-slate-500">No weaknesses found.</p>}
          </ul>
        </div>
      </div>

      {/* ATS Issues */}
      {analysis.atsIssues?.length > 0 && (
        <div className="rounded-[1.5rem] glass p-6">
          <h3 className="font-display text-lg text-white mb-3 flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-amber-400/15 text-xs text-amber-400">⚙</span>
            ATS Compatibility Issues
          </h3>
          <div className="grid gap-2 md:grid-cols-2">
            {analysis.atsIssues.map((issue, i) => (
              <div key={i} className="flex gap-2 text-sm text-slate-300 rounded-xl bg-amber-400/5 border border-amber-400/10 px-3 py-2.5">
                <span className="text-amber-400 mt-0.5">⚙</span>{issue}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bias Detection */}
      <div className="rounded-[1.5rem] glass p-6">
        <h3 className="font-display text-lg text-white mb-3 flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-violet-400/15 text-xs text-violet-400">🔍</span>
          Bias Detection
        </h3>
        <div className="grid gap-4 md:grid-cols-3">
          <BiasSection title="Gendered Words" items={bias.genderedWords} color="rose" />
          <BiasSection title="Unnecessary Personal Info" items={bias.unnecessaryPersonalInfo} color="amber" />
          <BiasSection title="Tone Issues" items={bias.toneIssues} color="violet" />
        </div>
      </div>

      {/* Detected Skills */}
      {analysis.detectedSkills?.length > 0 && (
        <div className="rounded-[1.5rem] glass p-6">
          <h3 className="font-display text-lg text-white mb-3">Detected Skills</h3>
          <div className="flex flex-wrap gap-2">
            {analysis.detectedSkills.map((skill, i) => (
              <span key={i} className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-xs font-medium text-cyan-200">
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function BiasSection({ title, items, color }) {
  const colors = {
    rose: 'border-rose-400/15 bg-rose-400/5 text-rose-300',
    amber: 'border-amber-400/15 bg-amber-400/5 text-amber-300',
    violet: 'border-violet-400/15 bg-violet-400/5 text-violet-300',
  }
  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <p className="text-xs font-semibold uppercase tracking-wider mb-2 opacity-80">{title}</p>
      {items?.length > 0 ? (
        <ul className="space-y-1">
          {items.map((item, i) => (
            <li key={i} className="text-sm text-slate-300">• {item}</li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-slate-500">None detected ✓</p>
      )}
    </div>
  )
}
