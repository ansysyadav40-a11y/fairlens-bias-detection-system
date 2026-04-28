import axios from 'axios'

const BASE = 'http://localhost:8005/api/audit'

export const uploadDataset = (file, labelCol, protectedAttr) => {
  const form = new FormData()
  form.append('file', file)
  return axios.post(`${BASE}/upload?label_col=${labelCol}&protected_attr=${protectedAttr}`, form)
}

export const getAuditStatus = (reportId) =>
  axios.get(`${BASE}/status/${reportId}`)

export const getAuditHistory = () =>
  axios.get(`${BASE}/history`)