import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'

export default function Explain() {
  const { reportId } = useParams()
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    axios.get(`http://localhost:8000/api/audit/explain/${reportId}`)
      .then(r => { setData(r.data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [reportId])

  if (loading) return <p className="text-gray-400">Loading explanation...</p>
  if (!data || data.error) return <p className="text-red-500">{data?.error || 'Failed to load'}</p>

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">AI Explanation</h1>
        <p className="text-gray-500 text-sm mt-1">{data.filename}</p>
      </div>

      {/* Score + verdict */}
      <div className="bg-white rounded-xl border p-5 flex items-center gap-6">
        <div className="text-center">
          <p className="text-xs text-gray-400">Fairness Score</p>
          <p className={`text-5xl font-bold ${
            data.fairness_score >= 80 ? 'text-green-600' :
            data.fairness_score >= 60 ? 'text-yellow-600' : 'text-red-600'
          }`}>{data.fairness_score}</p>
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-700">{data.verdict}</p>
          {data.proxy_features?.length > 0 && (
            <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="text-xs font-medium text-orange-700">⚠ Possible proxy features detected</p>
              <p className="text-xs text-orange-600 mt-1">
                These features may act as stand-ins for the protected attribute:
                <strong> {data.proxy_features.join(', ')}</strong>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Top features */}
      {data.top_features?.length > 0 && (
        <div className="bg-white rounded-xl border p-5">
          <h2 className="text-sm font-medium text-gray-600 mb-3">Top Influential Features</h2>
          <div className="flex flex-wrap gap-2">
            {data.top_features.map((f, i) => (
              <span key={f} className={`px-3 py-1 rounded-full text-xs font-medium ${
                i === 0 ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'
              }`}>#{i+1} {f}</span>
            ))}
          </div>
        </div>
      )}

      {/* SHAP chart */}
      {data.shap_chart_base64 && (
        <div className="bg-white rounded-xl border p-5">
          <h2 className="text-sm font-medium text-gray-600 mb-1">SHAP Feature Importance</h2>
          <p className="text-xs text-gray-400 mb-3">
            Red bar = protected attribute. Longer bars = more influence on predictions.
          </p>
          <img
            src={`data:image/png;base64,${data.shap_chart_base64}`}
            alt="SHAP feature importance chart"
            className="w-full rounded-lg"
          />
        </div>
      )}

      {/* LIME chart */}
      {data.lime_chart_base64 && (
        <div className="bg-white rounded-xl border p-5">
          <h2 className="text-sm font-medium text-gray-600 mb-1">LIME — Single Instance Explanation</h2>
          <p className="text-xs text-gray-400 mb-3">
            Green = pushed prediction toward positive class. Red = pushed toward negative.
          </p>
          <img
            src={`data:image/png;base64,${data.lime_chart_base64}`}
            alt="LIME explanation chart"
            className="w-full rounded-lg"
          />
        </div>
      )}
    </div>
  )
}