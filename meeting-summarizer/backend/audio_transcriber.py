import os
from groq import Groq
from dotenv import load_dotenv
from fastapi import HTTPException

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

SUPPORTED_AUDIO_FORMATS = {".mp3", ".mp4", ".wav", ".m4a", ".webm", ".ogg", ".flac"}

MAX_FILE_SIZE = 25 * 1024 * 1024  # 25MB — Groq Whisper API hard limit

def is_audio_file(filename: str) -> bool:
    ext = os.path.splitext(filename)[1].lower()
    return ext in SUPPORTED_AUDIO_FORMATS

async def transcribe_audio(file_content: bytes, filename: str) -> str:
    if len(file_content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail="File too large. Maximum size is 25MB for audio and video files."
        )

    ext = os.path.splitext(filename)[1].lower()

    mime_map = {
        ".mp3": "audio/mpeg",
        ".mp4": "video/mp4",
        ".wav": "audio/wav",
        ".m4a": "audio/mp4",
        ".webm": "audio/webm",
        ".ogg": "audio/ogg",
        ".flac": "audio/flac"
    }
    mime_type = mime_map.get(ext, "audio/mpeg")

    try:
        transcription = client.audio.transcriptions.create(
            file=(filename, file_content, mime_type),
            model="whisper-large-v3",
            response_format="text"
        )
        return transcription
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Transcription failed: {str(e)}"
        )
