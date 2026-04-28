import { useState, useRef } from 'react'
import { uploadDataset, getAuditStatus } from '../api/auditApi'
import { useNavigate } from 'react-router-dom'

export default function Upload() {
  const [file, setFile]               = useState(null)
  const [labelCol, setLabelCol]       = useState('income')
  const [protectedAttr, setProtected] = useState('sex')
  const [status, setStatus]           = useState('')
  const [score, setScore]             = useState(null)
  const [loading, setLoading]         = useState(false)
  const pollRef = useRef(null)
  const navigate = useNavigate()

  const handleUpload = async () => {
    if (!file) return
    setLoading(true)
    setStatus('Uploading...')
    setScore(null)

    try {
      const res = await uploadDataset(file, labelCol, protectedAttr)
      const reportId = res.data.report_id
      setStatus('Audit running...')

      // Poll every 2 seconds
      pollRef.current = setInterval(async () => {
        const poll = await getAuditStatus(reportId)
        const data = poll.data

        if (data.status === 'complete') {
          clearInterval(pollRef.current)
          setStatus('complete')
          setScore(data.fairness_score)
          setLoading(false)
          setTimeout(() => navigate('/'), 2000)
        } else if (data.status === 'failed') {
          clearInterval(pollRef.current)
          setStatus('Audit failed: ' + data.verdict)
          setLoading(false)
        }
      }, 2000)

    } catch (e) {
      setStatus('Error: ' + e.message)
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-semibold mb-6">Upload Dataset</h1>
      <div className="bg-white rounded-xl border p-6 space-y-4">

        <div>
          <label className="block text-sm text-gray-600 mb-1">CSV File</label>
          <input type="file" accept=".csv"
            onChange={e => setFile(e.target.files[0])}
            className="block w-full text-sm text-gray-500" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Label column</label>
            <input value={labelCol} onChange={e => setLabelCol(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Protected attribute</label>
            <input value={protectedAttr} onChange={e => setProtected(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>

        <button onClick={handleUpload} disabled={loading || !file}
          className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm
                     hover:bg-indigo-700 disabled:opacity-50">
          {loading ? 'Running audit...' : 'Run Audit'}
        </button>

        {status === 'complete' && score !== null && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <p className="text-sm text-green-600">Audit complete!</p>
            <p className="text-4xl font-bold text-green-700 mt-1">{score}<span className="text-lg">/100</span></p>
            <p className="text-xs text-green-500 mt-1">Redirecting to dashboard...</p>
          </div>
        )}

        {status && status !== 'complete' && (
          <p className="text-sm text-gray-500">{status}</p>
        )}
      </div>
    </div>
  )
}