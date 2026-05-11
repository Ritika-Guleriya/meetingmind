"""
Speaker Analytics — analyzes a transcript locally to extract per-speaker
statistics: talk time, word count, questions asked, and contributions to
decisions/action items. No external API calls.
"""

import re
from collections import defaultdict


def parse_speaker_lines(transcript: str):
    """
    Parse a transcript that has 'Name: text' format.
    Returns a list of (speaker, text) tuples.
    Lines without a speaker prefix are attached to the previous speaker.
    """
    lines = transcript.split("\n")
    parsed = []
    current_speaker = None
    current_text = []

    # Match "Name:" at the start of a line (allow letters, spaces, dots, hyphens)
    speaker_pattern = re.compile(r"^([A-Za-z][A-Za-z .\-']{0,40}):\s*(.*)$")

    for line in lines:
        line = line.rstrip()
        if not line.strip():
            continue
        m = speaker_pattern.match(line)
        if m:
            # Save previous speaker block
            if current_speaker is not None:
                parsed.append((current_speaker, " ".join(current_text).strip()))
            current_speaker = m.group(1).strip()
            current_text = [m.group(2).strip()] if m.group(2).strip() else []
        else:
            if current_speaker is not None:
                current_text.append(line.strip())

    # Append final block
    if current_speaker is not None:
        parsed.append((current_speaker, " ".join(current_text).strip()))

    return parsed


def count_questions(text: str) -> int:
    """Count question marks in the text."""
    return text.count("?")


def count_words(text: str) -> int:
    """Count words in the text."""
    if not text:
        return 0
    return len([w for w in text.split() if w.strip()])


def count_contributions(speaker: str, action_items, decisions) -> int:
    """
    Count how many times this speaker's name appears in action_items
    (as 'owner' field) or in the text of decisions.
    """
    count = 0
    speaker_lower = speaker.lower().strip()

    # Action items — check 'owner' field
    if isinstance(action_items, list):
        for item in action_items:
            if isinstance(item, dict):
                owner = str(item.get("owner", "")).lower().strip()
                if owner and (owner == speaker_lower or speaker_lower in owner):
                    count += 1
            elif isinstance(item, str):
                if speaker_lower in item.lower():
                    count += 1

    # Decisions — check if speaker name is mentioned
    if isinstance(decisions, list):
        for d in decisions:
            if isinstance(d, str) and speaker_lower in d.lower():
                count += 1

    return count


def analyze_speakers(transcript: str, action_items=None, decisions=None) -> dict:
    """
    Main entry point. Returns a dict with speaker analytics.
    If no speakers are detected, returns an empty/default structure.
    """
    if action_items is None:
        action_items = []
    if decisions is None:
        decisions = []

    parsed = parse_speaker_lines(transcript)

    if not parsed:
        return {
            "has_speakers": False,
            "total_speakers": 0,
            "total_words": count_words(transcript),
            "speakers": [],
            "most_active": None
        }

    # Aggregate per speaker
    stats = defaultdict(lambda: {"words": 0, "questions": 0, "lines": 0, "text": ""})
    for speaker, text in parsed:
        stats[speaker]["words"] += count_words(text)
        stats[speaker]["questions"] += count_questions(text)
        stats[speaker]["lines"] += 1
        stats[speaker]["text"] += " " + text

    total_words = sum(s["words"] for s in stats.values())
    if total_words == 0:
        total_words = 1  # avoid division by zero

    speakers_list = []
    for speaker, s in stats.items():
        contributions = count_contributions(speaker, action_items, decisions)
        talk_pct = round((s["words"] / total_words) * 100, 1)
        speakers_list.append({
            "name": speaker,
            "word_count": s["words"],
            "talk_percentage": talk_pct,
            "questions_asked": s["questions"],
            "lines_spoken": s["lines"],
            "contributions": contributions
        })

    # Sort by talk percentage descending
    speakers_list.sort(key=lambda x: x["talk_percentage"], reverse=True)

    most_active = speakers_list[0]["name"] if speakers_list else None

    return {
        "has_speakers": True,
        "total_speakers": len(speakers_list),
        "total_words": sum(s["words"] for s in stats.values()),
        "speakers": speakers_list,
        "most_active": most_active
    }
