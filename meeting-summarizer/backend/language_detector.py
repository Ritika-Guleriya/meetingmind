from langdetect import detect, LangDetectException

# Map of language codes to full language names for use in prompts
LANGUAGE_NAMES = {
    "en": "English",
    "hi": "Hindi",
    "es": "Spanish",
    "fr": "French",
    "de": "German",
    "zh-cn": "Chinese (Simplified)",
    "zh-tw": "Chinese (Traditional)",
    "ar": "Arabic",
    "pt": "Portuguese",
    "ru": "Russian",
    "ja": "Japanese",
    "ko": "Korean",
    "it": "Italian",
    "nl": "Dutch",
    "tr": "Turkish",
    "pl": "Polish",
    "sv": "Swedish",
    "da": "Danish",
    "fi": "Finnish",
    "no": "Norwegian",
    "bn": "Bengali",
    "ta": "Tamil",
    "te": "Telugu",
    "mr": "Marathi",
    "gu": "Gujarati",
    "ur": "Urdu",
    "pa": "Punjabi",
}

def detect_language(text: str) -> tuple[str, str]:
    """
    Detects language of the given text.
    Returns a tuple of (language_code, language_name).
    Falls back to English if detection fails.
    """
    try:
        # Use only the first 1000 characters for speed
        sample = text[:1000].strip()
        if not sample:
            return ("en", "English")
        
        code = detect(sample)
        name = LANGUAGE_NAMES.get(code, "English")
        return (code, name)
    except LangDetectException:
        return ("en", "English")
