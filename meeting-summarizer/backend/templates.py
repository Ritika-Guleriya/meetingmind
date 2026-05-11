"""
Meeting templates — each template defines extra fields the LLM should extract
based on the meeting type. The base summary, decisions, action items, email
draft, and sentiment are always extracted regardless of template.
"""

TEMPLATES = {
    "general": {
        "name": "General Meeting",
        "extra_instructions": "",
        "extra_fields": {}
    },
    "standup": {
        "name": "Daily Standup",
        "extra_instructions": (
            "This is a daily standup meeting. For each speaker, extract what "
            "they did yesterday, what they plan to do today, and any blockers "
            "they mentioned. If a speaker did not mention one of these, use an "
            "empty string."
        ),
        "extra_fields": {
            "standup_updates": [
                {
                    "speaker": "Name",
                    "yesterday": "What they did yesterday",
                    "today": "What they plan to do today",
                    "blockers": "Any blockers, or empty string"
                }
            ]
        }
    },
    "client_call": {
        "name": "Client Call",
        "extra_instructions": (
            "This is a client call. Extract specific client requirements, "
            "commitments made by our team to the client, follow-up tasks, "
            "and the overall client sentiment (Happy, Neutral, Frustrated)."
        ),
        "extra_fields": {
            "client_requirements": ["Requirement 1", "Requirement 2"],
            "commitments_made": ["Commitment 1", "Commitment 2"],
            "follow_up_tasks": ["Task 1", "Task 2"],
            "client_sentiment": "Happy | Neutral | Frustrated"
        }
    },
    "interview": {
        "name": "Job Interview",
        "extra_instructions": (
            "This is a job interview. Extract the candidate's strengths, "
            "weaknesses, notable answers given, and provide a final hiring "
            "recommendation as exactly one of: Hire, Maybe, No Hire."
        ),
        "extra_fields": {
            "candidate_strengths": ["Strength 1", "Strength 2"],
            "candidate_weaknesses": ["Weakness 1", "Weakness 2"],
            "key_answers": ["Answer 1", "Answer 2"],
            "recommendation": "Hire | Maybe | No Hire"
        }
    },
    "brainstorm": {
        "name": "Brainstorming Session",
        "extra_instructions": (
            "This is a brainstorming session. Extract all ideas generated, "
            "the top picks the team agreed on, ideas that were rejected, "
            "and the next steps for moving forward."
        ),
        "extra_fields": {
            "ideas_generated": ["Idea 1", "Idea 2"],
            "top_picks": ["Top idea 1", "Top idea 2"],
            "rejected_ideas": ["Rejected idea 1"],
            "next_steps": ["Step 1", "Step 2"]
        }
    },
    "one_on_one": {
        "name": "One-on-One",
        "extra_instructions": (
            "This is a one-on-one meeting. Extract the main discussion points, "
            "feedback given, goals set, and any concerns raised."
        ),
        "extra_fields": {
            "discussion_points": ["Point 1", "Point 2"],
            "feedback_given": ["Feedback 1", "Feedback 2"],
            "goals_set": ["Goal 1", "Goal 2"],
            "concerns_raised": ["Concern 1", "Concern 2"]
        }
    }
}


def get_template(template_id: str) -> dict:
    """Return the template config for the given ID, or general if not found."""
    return TEMPLATES.get(template_id, TEMPLATES["general"])


def build_template_prompt_addition(template_id: str) -> str:
    """Build the extra prompt text to inject for the selected template."""
    template = get_template(template_id)
    if template_id == "general" or not template["extra_instructions"]:
        return ""

    import json
    extra_json = json.dumps(template["extra_fields"], indent=2)
    # Escape curly braces for .format() compatibility
    extra_json_escaped = extra_json.replace("{", "{{").replace("}", "}}")

    return (
        f"\n\nADDITIONAL TEMPLATE INSTRUCTIONS ({template['name']}):\n"
        f"{template['extra_instructions']}\n\n"
        f"In addition to all standard fields, also include these fields in the JSON:\n"
        f"{extra_json_escaped}\n"
    )
