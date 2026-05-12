"""
Summarizer module using Groq API for meeting transcript analysis.
Uses the llama-3.1-8b-instant model for fast, cost-effective summarization.
"""

import json
import os
from groq import Groq
from dotenv import load_dotenv
from language_detector import detect_language
from templates import build_template_prompt_addition, get_template

# Load environment variables
load_dotenv()

# Initialize Groq client
client = Groq(api_key=os.getenv('GROQ_API_KEY'))


def summarize(transcript: str, template_id: str = "general") -> dict:
    """
    Summarize a meeting transcript using Groq API.
    
    Args:
        transcript: The meeting transcript text
        template_id: Meeting template type (default: "general")
        
    Returns:
        Dictionary containing:
        - summary: Brief summary of the meeting
        - action_items: List of tasks with owners and deadlines
        - decisions: List of decisions made
        - key_topics: List of topics discussed
        - email_draft: Professional follow-up email
        - detected_language: Name of detected language
        - detected_language_code: Code of detected language
        - sentiment: Meeting sentiment and tone analysis
        - template_used: Name of the template used
        - [template-specific fields]: Additional fields based on template
        
    Raises:
        ValueError: If API response is invalid JSON
        RuntimeError: If API call fails
    """
    
    # Detect language first (with error handling to prevent blocking)
    try:
        lang_code, lang_name = detect_language(transcript)
    except Exception:
        lang_code, lang_name = "en", "English"
    
    # Build template-specific prompt addition
    template_addition = build_template_prompt_addition(template_id)
    
    # System prompt - instructs the model to respond with valid JSON only
    system_prompt = """You are an expert meeting analyst. Your job is to analyze meeting transcripts and extract structured information. Always respond with valid JSON only — no markdown, no explanation, no preamble. Never include ```json or ``` in your response. Ensure the JSON is properly formatted and parseable."""
    
    # User prompt with language instruction and the transcript
    user_prompt = f"""Analyze this meeting transcript and return a JSON object with exactly these fields.

The transcript is in {lang_name}. Please write your response in {lang_name}.

For the sentiment field:
- overall must be exactly one of: Positive, Neutral, Negative
- score must be a number from 0 to 100 where 0 is most negative, 50 is neutral, 100 is most positive
- tone must be exactly one of: Collaborative, Tense, Decisive, Confused, Motivational, Formal
- tone_description must be one sentence explaining the tone
- speaker_sentiments: if the transcript has speaker names like "John: ...", include each unique speaker with their sentiment as Positive, Neutral, or Negative. If no speaker names exist, return an empty array.

{{
  "summary": "A clear 3-4 sentence summary of the entire meeting",
  "action_items": [
    {{ "task": "specific task description", "owner": "person name or Team if unclear", "deadline": "deadline if mentioned or Not specified" }}
  ],
  "decisions": [
    "Decision 1 that was made"
  ],
  "key_topics": [
    "Topic 1 discussed"
  ],
  "email_draft": "A professional follow-up email starting with Subject: on the first line, then a blank line, then the email body.",
  "sentiment": {{
    "overall": "Positive",
    "score": 75,
    "tone": "Collaborative",
    "tone_description": "One sentence explaining why the meeting had this tone",
    "speaker_sentiments": [
      {{ "speaker": "Name", "sentiment": "Positive" }}
    ]
  }}
}}

If the transcript has speaker names like John: ..., use them in action item owners.
If no decisions were made, return an empty array for decisions.

TRANSCRIPT:
{transcript}{template_addition}"""
    
    try:
        # Call Groq API
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {
                    "role": "system",
                    "content": system_prompt
                },
                {
                    "role": "user",
                    "content": user_prompt
                }
            ],
            temperature=0.3,  # Lower temperature for more consistent output
            max_tokens=2000
        )
        
        # Extract response text
        response_text = response.choices[0].message.content
        
        # Clean up response - remove any markdown code block markers if present
        response_text = response_text.strip()
        if response_text.startswith('```json'):
            response_text = response_text[7:]
        if response_text.startswith('```'):
            response_text = response_text[3:]
        if response_text.endswith('```'):
            response_text = response_text[:-3]
        response_text = response_text.strip()
        
        # Parse JSON response
        try:
            result = json.loads(response_text, strict=False)
            result["detected_language"] = lang_name
            result["detected_language_code"] = lang_code
            result["template_used"] = get_template(template_id)["name"]
            return result
        except json.JSONDecodeError as e:
            raise ValueError(f"Failed to parse API response as JSON: {str(e)}\n\nResponse: {response_text}")
    
    except Exception as e:
        raise RuntimeError(f"API call failed: {str(e)}")
