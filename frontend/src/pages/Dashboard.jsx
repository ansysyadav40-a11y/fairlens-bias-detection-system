import { useEffect, useState } from 'react'
import { getAuditHistory, getAuditStatus } from '../api/auditApi'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts'

export default function Dashboard() {
  const [audits, setAudits]   = useState([])
  const [latest, setLatest]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const res = await getAuditHistory()
      const list = res.data.audits
      setAudits(list)

      // Load detailed metrics for the most recent complete audit
      const recent = list.find(a => a.status === 'complete')
      if (recent) {
        const det = await getAuditStatus(recent.id)
        setLatest(det.data)
      }
      setLoading(false)
    }
    load()
  }, [])

  const radarData = latest ? [
    { metric: 'Disparate Impact',    value: Math.min(latest.disparate_impact ?? 0, 1) * 100 },
    { metric: 'Demographic Parity',  value: (1 - Math.abs(latest.demographic_parity ?? 0)) * 100 },
    { metric: 'Equalized Odds',      value: (1 - Math.abs(latest.equalized_odds ?? 0)) * 100 },
  ] : []

  const historyData = audits
    .filter(a => a.fairness_score !== null)
    .slice(0, 10)
    .reverse()
    .map(a => ({ name: a.filename.replace('.csv', ''), score: a.fairness_score }))

  if (loading) return <p className="text-gray-400">Loading dashboard...</p>

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Audit Dashboard</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border p-5">
          <p className="text-sm text-gray-500">Latest Fairness Score</p>
          <p className={`text-4xl font-bold mt-1 ${
            latest?.fairness_score >= 80 ? 'text-green-600' :
            latest?.fairness_score >= 60 ? 'text-yellow-600' : 'text-red-600'
          }`}>{latest?.fairness_score ?? '—'}</p>
        </div>
        <div className="bg-white rounded-xl border p-5">
          <p className="text-sm text-gray-500">Total Audits</p>
          <p className="text-4xl font-bold mt-1">{audits.length}</p>
        </div>
        <div className="bg-white rounded-xl border p-5">
          <p className="text-sm text-gray-500">Bias Severity</p>
          <p className={`text-2xl font-bold mt-1 ${
            latest?.fairness_score >= 80 ? 'text-green-600' :
            latest?.fairness_score >= 60 ? 'text-yellow-600' : 'text-red-600'
          }`}>{
            latest?.fairness_score >= 80 ? 'LOW' :
            latest?.fairness_score >= 60 ? 'MEDIUM' : 'HIGH'
          }</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Radar chart */}
        {latest && (
          <div className="bg-white rounded-xl border p-5">
            <h2 className="text-sm font-medium text-gray-600 mb-4">Fairness Metrics Radar</h2>
            <ResponsiveContainer width="100%" height={240}>
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
                <Radar name="Score" dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Score history */}
        {historyData.length > 0 && (
          <div className="bg-white rounded-xl border p-5">
            <h2 className="text-sm font-medium text-gray-600 mb-4">Score History</h2>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={historyData}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="score" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Latest verdict */}
      {latest && (
        <div className="bg-white rounded-xl border p-5">
          <h2 className="text-sm font-medium text-gray-600 mb-2">Latest Audit — {latest.filename}</h2>
          <p className="text-sm text-gray-700">{latest.verdict}</p>
          <div className="grid grid-cols-3 gap-3 mt-4">
            {Object.entries(latest).filter(([k]) =>
              ['disparate_impact','demographic_parity','equalized_odds'].includes(k)
            ).map(([k, v]) => (
              <div key={k} className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 capitalize">{k.replace(/_/g,' ')}</p>
                <p className="text-lg font-semibold">{v?.toFixed(4) ?? '—'}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Audit history table */}
      <div className="bg-white rounded-xl border p-5 mt-6">
        <h2 className="text-sm font-medium text-gray-600 mb-3">Audit History</h2>
        {audits.length === 0 ? (
          <p className="text-gray-400 text-sm">No audits yet — upload a dataset to begin.</p>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="text-left text-gray-400 border-b">
              <th className="pb-2">File</th>
              <th className="pb-2">Score</th>
              <th className="pb-2">Status</th>
              <th className="pb-2">Date</th>
            </tr></thead>
            <tbody>{audits.map(a => (
              <tr key={a.id} className="border-b last:border-0">
                <td className="py-2">{a.filename}</td>
                <td className="py-2 font-semibold">{a.fairness_score ?? '—'}</td>
                <td className="py-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    a.status === 'complete' ? 'bg-green-100 text-green-700' :
                    a.status === 'failed'   ? 'bg-red-100 text-red-700' :
                                             'bg-yellow-100 text-yellow-700'
                  }`}>{a.status}</span>
                </td>
                <td className="py-2">
                  {a.status === 'complete' && (
                    <a href={`/explain/${a.id}`}
                    className="text-indigo-600 text-xs hover:underline">
                      View Explanation →
                      </a>
                    )}
                    </td>
                <td className="py-2 text-gray-400">{a.created_at?.slice(0,10)}</td>
              </tr>
              
            ))}</tbody>
          </table>
        )}
      </div>
    </div>
  )
}