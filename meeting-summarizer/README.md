# MeetingMind - Smart Meeting Summarizer

**MeetingMind** is an AI-powered web application that automatically summarizes meeting transcripts, extracts action items, identifies decisions, and generates follow-up emails. Simply paste a transcript or upload a document, and get instant, structured summaries powered by the Groq API and the lightning-fast Llama 3.1 model.

---

## Features

✨ **Instant Summarization** — Convert long meeting transcripts into concise, actionable summaries in seconds

📝 **Multiple Input Methods** — Paste text directly or upload TXT, PDF, or DOCX files

🎯 **Smart Extraction** — Automatically identify:
- Meeting summary
- Action items with owners and deadlines
- Key decisions made
- Main topics discussed

📧 **Email Drafting** — Generate professional follow-up emails ready to send

💾 **Local History** — Save up to 10 recent summaries in your browser (localStorage)

📊 **Export Options** — Copy, download as TXT, or print as PDF

📱 **Fully Responsive** — Works seamlessly on desktop, tablet, and mobile devices

🎨 **Clean UI** — Modern, intuitive interface with smooth animations

---

## Tech Stack

- **Frontend:** HTML5, CSS3, Vanilla JavaScript (no frameworks)
- **Backend:** Python with FastAPI
- **AI Model:** Groq API (`llama-3.1-8b-instant` model)
- **File Parsing:** PyMuPDF (PDF), python-docx (DOCX), native UTF-8 (TXT)
- **Async Runtime:** uvicorn + FastAPI

---

## How It Works

1. **Input** — User provides a meeting transcript via paste or file upload
2. **Processing** — Backend parses the file/text and sends it to the Groq API
3. **AI Analysis** — Llama 3.1 analyzes the transcript and extracts structured data as JSON
4. **Display** — Results are rendered in a tabbed interface with all 5 output types
5. **Storage** — Summary is saved to browser history for future reference

---

## Setup Instructions

### Prerequisites

- Python 3.8+
- A Groq API key (get one free at [console.groq.com](https://console.groq.com))
- A modern web browser (Chrome, Firefox, Safari, Edge)

### Backend Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd meeting-summarizer
   ```

2. **Install dependencies**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env and add your Groq API key
   # GROQ_API_KEY=your_actual_key_here
   ```

4. **Start the backend server**
   ```bash
   uvicorn main:app --reload
   ```
   The API will be available at `http://localhost:8000`

### Frontend Setup

1. **Open the frontend**
   - Option A: Use VS Code Live Server extension
     - Right-click `frontend/index.html` → "Open with Live Server"
   - Option B: Open directly in browser
     - File → Open → `frontend/index.html`
   - Option C: Use Python's built-in HTTP server
     ```bash
     cd frontend
     python -m http.server 5500
     # Visit http://localhost:5500
     ```

---

## Project Structure

```
meeting-summarizer/
├── backend/
│   ├── main.py                 # FastAPI application entry point
│   ├── summarizer.py           # Groq API integration logic
│   ├── file_parser.py          # PDF, DOCX, TXT parsing utilities
│   ├── requirements.txt        # Python dependencies
│   └── .env.example            # Environment variables template
├── frontend/
│   ├── index.html              # HTML structure
│   ├── style.css               # Responsive styling
│   └── app.js                  # Frontend logic & API integration
└── README.md                   # This file
```

---

## API Endpoints

### POST /summarize

Summarizes a meeting transcript.

**Request (multipart/form-data):**
- `transcript_text` (optional): String containing the transcript
- `file` (optional): Uploaded file (.txt, .pdf, .docx)

**Response:**
```json
{
  "summary": "Brief 3-4 sentence summary of the meeting",
  "action_items": [
    {
      "task": "Task description",
      "owner": "Person responsible",
      "deadline": "When it's due"
    }
  ],
  "decisions": ["Decision 1", "Decision 2"],
  "key_topics": ["Topic 1", "Topic 2"],
  "email_draft": "Professional follow-up email with Subject: line"
}
```

---

## Usage Example

1. Start both backend and frontend servers
2. Go to the web interface
3. Choose input method:
   - **Paste Text:** Copy-paste a meeting transcript
   - **Upload File:** Drag & drop or browse for TXT/PDF/DOCX
4. Click "Generate Summary"
5. View results in tabbed interface
6. Use Export options to copy, download, or print

---

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile browsers (iOS Safari, Chrome Mobile)

---

## Troubleshooting

### "No API key provided" error
- Ensure `.env` file exists in the `backend/` directory
- Verify the GROQ_API_KEY is set correctly
- Restart the backend server after adding the key

### CORS error on frontend
- Ensure backend is running on `http://localhost:8000`
- Check that CORS middleware is enabled in `main.py`

### File upload not working
- Verify file extension is .txt, .pdf, or .docx
- Check file size (should be reasonable for LLM processing)
- Ensure browser allows file uploads

### Summary not displaying
- Check browser console for errors (F12 → Console)
- Verify backend is running and API endpoint is accessible
- Check network tab to see if API call succeeded

---

## Performance Notes

- **Speed:** Average response time is 2-5 seconds (depends on transcript length)
- **Limits:** Backend processes up to ~4000 tokens per request (approx. 16,000 characters)
- **Storage:** History saves only in browser localStorage (max 10 items)
- **Export:** PDF uses browser print dialog (works best on desktop)

---

## License

This project is provided as-is for educational and personal use.

---

## Support

For issues or questions, check:
1. Groq API documentation: https://console.groq.com/docs
2. FastAPI docs: https://fastapi.tiangolo.com
3. Browser console (F12) for client-side errors
4. Terminal output for backend errors

---

**Happy summarizing! 🎉**
