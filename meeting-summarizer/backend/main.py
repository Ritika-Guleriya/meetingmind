"""
FastAPI backend for Smart Meeting Summarizer.
Provides endpoints for summarizing meeting transcripts via text or file upload,
and handling user authentication.
"""

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
from starlette.requests import Request
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
import logging
import json
import os

from summarizer import summarize
from file_parser import parse_file
from audio_transcriber import is_audio_file, transcribe_audio
from speaker_analytics import analyze_speakers

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ===================================
# SECURITY & AUTHENTICATION SETUP
# ===================================

SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

# Simple in-memory user database (replace with real database in production)
users_db = {}
users_file = "users.json"

# Load users from file if it exists
def load_users():
    global users_db
    if os.path.exists(users_file):
        try:
            with open(users_file, 'r') as f:
                users_db = json.load(f)
        except:
            users_db = {}

# Save users to file
def save_users():
    with open(users_file, 'w') as f:
        json.dump(users_db, f)

load_users()

# ===================================
# PYDANTIC MODELS
# ===================================

class SignUpRequest(BaseModel):
    fullName: str
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

# ===================================
# HELPER FUNCTIONS
# ===================================

# ===================================
# HELPER FUNCTIONS
# ===================================

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(email: str, expires_delta: Optional[timedelta] = None):
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {"sub": email, "exp": expire}
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(request: Request):
    """
    Verify JWT token from Authorization header
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        raise HTTPException(status_code=401, detail="Missing authorization header")
    
    try:
        scheme, token = auth_header.split()
        if scheme.lower() != "bearer":
            raise HTTPException(status_code=401, detail="Invalid authentication scheme")
        
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return email
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

# Initialize FastAPI app
app = FastAPI(title="Meeting Summarizer API", version="1.0.0")

# Configure CORS - allow all origins for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://meeting-mind-rtmg.onrender.com", 
        "http://localhost:8000",
        "*"
     ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """
    Health check endpoint.
    """
    return {"message": "Meeting Summarizer API is running"}


# ===================================
# AUTHENTICATION ENDPOINTS
# ===================================

@app.post("/signup", response_model=Token)
async def signup(request: SignUpRequest):
    """
    Create a new user account.
    """
    try:
        # Check if user already exists
        if request.email in users_db:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        # Store user
        users_db[request.email] = {
            "fullName": request.fullName,
            "email": request.email,
            "password": hash_password(request.password),
            "created_at": datetime.utcnow().isoformat()
        }
        save_users()
        
        # Create token
        access_token = create_access_token(request.email)
        return {"access_token": access_token, "token_type": "bearer"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Signup error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Signup failed: {str(e)}")


@app.post("/login", response_model=Token)
async def login(request: LoginRequest):
    """
    Login with email and password.
    """
    # Check if user exists
    if request.email not in users_db:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    user = users_db[request.email]
    
    # Verify password
    if not verify_password(request.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Create token
    access_token = create_access_token(request.email)
    return {"access_token": access_token, "token_type": "bearer"}


@app.post("/summarize")
async def summarize_endpoint(
    transcript_text: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    template_id: str = Form("general")
):
    """
    Summarize a meeting transcript.
    
    Accepts either:
    - transcript_text: A string containing the meeting transcript
    - file: An uploaded file (txt, pdf, or docx)
    
    Returns:
    - summary: Brief summary of the meeting
    - action_items: List of tasks with owners and deadlines
    - decisions: List of decisions made
    - key_topics: List of topics discussed
    - email_draft: Professional follow-up email
    """
    
    logger.info(f"Received request with transcript_text={bool(transcript_text)}, file={file.filename if file else None}, template_id={template_id}")
    
    # Validate that at least one input is provided
    if not transcript_text and not file:
        logger.error("No input provided")
        raise HTTPException(
            status_code=400,
            detail="No transcript provided. Please paste text or upload a file."
        )
    
    try:
        # Determine which input to use
        if file and file.filename:
            logger.info(f"Processing file: {file.filename}")
            if is_audio_file(file.filename):
                # NEW: audio/video — transcribe first, then summarize as usual
                logger.info("File is audio/video, transcribing...")
                file_content = await file.read()
                transcript = await transcribe_audio(file_content, file.filename)
                logger.info(f"Transcription completed, transcript length: {len(transcript)}")
            else:
                # EXISTING: text/PDF/DOCX — unchanged, do not touch this
                logger.info(f"Parsing file: {file.filename}")
                transcript = await parse_file(file)
                logger.info(f"File parsed, transcript length: {len(transcript)}")
                if not transcript.strip():
                    raise HTTPException(
                        status_code=400,
                        detail="File is empty or contains no readable text."
                    )
        elif transcript_text and transcript_text.strip():
            # EXISTING: pasted text — unchanged, do not touch this
            logger.info("Using pasted text")
            transcript = transcript_text.strip()
        else:
            raise HTTPException(status_code=400, detail="No transcript provided. Please paste text or upload a file.")
        
        logger.info(f"Summarizing transcript (length: {len(transcript)} characters) with template: {template_id}")
        
        # Call summarizer with template_id
        result = summarize(transcript, template_id=template_id)
        
        logger.info("Summary generated successfully")
        
        # Analyze speakers locally (no extra API call)
        try:
            analytics = analyze_speakers(
                transcript,
                action_items=result.get("action_items", []),
                decisions=result.get("decisions", [])
            )
            result["speaker_analytics"] = analytics
        except Exception as e:
            result["speaker_analytics"] = {
                "has_speakers": False,
                "total_speakers": 0,
                "total_words": 0,
                "speakers": [],
                "most_active": None
            }
        
        return result
    
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"ValueError: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to parse summary response: {str(e)}"
        )
    except RuntimeError as e:
        logger.error(f"RuntimeError: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"API Error: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"An unexpected error occurred: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn
    # Run with: uvicorn main:app --reload
    uvicorn.run(app, host="0.0.0.0", port=8000)
