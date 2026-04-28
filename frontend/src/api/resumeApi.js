import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE || ''

export const analyzeResume = (file) => {
  const form = new FormData()
  form.append('file', file)
  return axios.post(`${API_BASE}/api/resume/analyze`, form, {
    timeout: 120000,
  })
}

export const chatWithCoach = (resumeText, analysis, message, chatHistory = []) =>
  axios.post(`${API_BASE}/api/resume/chat`, {
    resume_text: resumeText,
    analysis,
    message,
    chat_history: chatHistory,
  }, { timeout: 60000 })

export const matchJob = (resumeText, jobDescription) =>
  axios.post(`${API_BASE}/api/resume/job-match`, {
    resume_text: resumeText,
    job_description: jobDescription,
  }, { timeout: 60000 })

export const fixMyResume = (resumeText) =>
  axios.post(`${API_BASE}/api/resume/fix`, {
    resume_text: resumeText,
  }, { timeout: 90000 })

export const getGeminiStatus = () =>
  axios.get(`${API_BASE}/api/gemini/status`)
