# 🛡️ FairLens AI: Premium Resume Analysis & Bias Detection

[![Gemini AI](https://img.shields.io/badge/Powered%20By-Google%20Gemini%203.0-blue?style=for-the-badge&logo=google-gemini)](https://ai.google.dev/)
[![React](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB?style=for-the-badge&logo=react)](https://reactjs.org/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

**FairLens AI** is a state-of-the-art career optimization platform designed to eliminate hidden biases and maximize ATS (Applicant Tracking System) performance. Using **Google Gemini 3.0 Flash**, it provides deep psychological and technical analysis of resumes to help job seekers stand out in a crowded market.

---

## ✨ Key Features

### 🔍 1. Intelligent Bias Detection
Identify and remove hidden biases that could be holding you back:
- **Gender Bias:** Detects gendered pronouns and titles.
- **Age Bias:** Flags age-coded language like "recent grad" or "30+ years experience".
- **Linguistic Bias:** Identifies "native speaker" requirements or mother tongue references.
- **Tone Analysis:** Detects overly aggressive or passive language.

### ⚙️ 2. ATS Optimization Engine
- **Score Analysis:** Get a 0-100 score based on real-world recruiter criteria.
- **Skill Extraction:** Automatically identifies your technical stack.
- **Quick Wins:** Actionable advice to boost your score in under 5 minutes.
- **Section Analysis:** Ensures your resume has all the "must-have" sections.

### 🤖 3. AI Career Coach & Job Matcher
- **Chat Coach:** Talk directly to an AI career coach about your specific resume.
- **Job Matching:** Upload a job description and see your "Compatibility Score" instantly.
- **Smart Rewriter:** Get high-impact rewrites for your summary and experience.

---

## 🛠️ Tech Stack

- **Frontend:** React 18, Vite, Tailwind CSS, Framer Motion (for premium animations).
- **Backend:** Python 3.10+, FastAPI, Uvicorn.
- **AI:** Google Gemini 3.0 (Primary), Ollama (Local Fallback).
- **Libraries:** `pypdf`, `python-docx`, `google-genai`.

---

## 🚀 Installation & Setup

### 1. Prerequisites
- **Node.js** (v18 or higher)
- **Python** (v3.10 or higher)
- **Google Gemini API Key** ([Get it here](https://aistudio.google.com/apikey))

### 2. Backend Installation
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

**Configure `.env`:**
```env
DATABASE_URL=sqlite:///./fairlens.db
SECRET_KEY=generate-a-random-secret-here
GEMINI_API_KEY=your_key_1,your_key_2
```

### 3. Frontend Installation
```bash
cd frontend
npm install
npm run dev
```

---

## 📖 How to Use
1. **Upload:** Drop your PDF or DOCX resume into the dashboard.
2. **Analyze:** Wait ~3 seconds for the Gemini AI to perform a deep-scan.
3. **Review Bias:** Check the "Bias Detection" tab to ensure your resume is inclusive.
4. **Improve:** Follow the "Quick Wins" and use the "AI Rewriter" to polish your content.
5. **Chat:** Ask the AI Coach questions like *"How can I make my Python experience sound more senior?"*

---

## 🛡️ License
Distributed under the MIT License. See `LICENSE` for more information.

## 🤝 Contributing
Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

---

**Developed with ❤️ by [Ansy Yadav](https://github.com/ansysyadav40-a11y), [Krishna Ransing](https://github.com/Krishna-8218),**
