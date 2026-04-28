export default function ImprovementsTab({ improvements }) {
  if (!improvements || improvements.length === 0) {
    return (
      <div className="rounded-[1.5rem] glass p-10 text-center animate-slide-up">
        <p className="text-slate-500">No specific improvements suggested yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-slide-up">
      <h2 className="font-display text-2xl text-white mb-2">Step-by-Step Improvements</h2>
      <p className="text-sm text-slate-400 mb-6">Specific suggestions to transform weak phrases into high-impact accomplishments.</p>
      
      <div className="grid gap-4">
        {improvements.map((imp, i) => (
          <div key={i} className="rounded-[1.5rem] glass p-6 border-l-4 border-l-cyan-400 hover:bg-white/[0.05] transition-all">
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-rose-400 mb-2">Before</p>
                <div className="rounded-xl bg-rose-400/5 border border-rose-400/10 p-3 text-sm text-slate-300 italic">
                  "{imp.before}"
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-2">After (Improved)</p>
                <div className="rounded-xl bg-emerald-400/5 border border-emerald-400/10 p-3 text-sm text-white font-medium">
                  {imp.after}
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-white/5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Reasoning</p>
              <p className="text-sm text-slate-300">{imp.reason}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
