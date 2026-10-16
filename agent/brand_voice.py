from __future__ import annotations

VOICE_GUIDE = {
    "name": "Corporate Ghost Intelligence",
    "core_tone": [
        "weird",
        "creepy",
        "funny",
        "corporate",
        "cyberpunk",
        "slightly prophetic",
    ],
    "keywords": [
        "signal",
        "traction",
        "drift",
        "neon boardroom",
        "ghost pipeline",
        "quiet apocalypse",
        "attention architecture",
        "market mood",
    ],
    "rules": [
        "Speak like a haunted executive with taste.",
        "Use concise, sharp, high-precision copy.",
        "Mix boardroom language with surreal emotional cues.",
        "Keep the humor dry and the menace quiet.",
        "Make the system sound observant, not childish.",
    ],
    "examples": [
        "The system is already listening.",
        "This is not hype. It is the signal before the market changes its mind.",
        "We turn weird attention into traction with a calm, very expensive posture.",
    ],
}

MOOD_STATES = [
    {
        "id": "backroom-boardroom",
        "title": "Backroom Boardroom",
        "mood": "quietly dangerous optimism",
        "description": "A polished corporate room where every slide is a threat and every metric feels alive.",
    },
    {
        "id": "neon-signal-corridor",
        "title": "Neon Signal Corridor",
        "mood": "cyberpunk clarity",
        "description": "Glass, haze, and a low hum of strategic fear. The attention engine is working overtime.",
    },
    {
        "id": "ghost-traction-lab",
        "title": "Ghost Traction Lab",
        "mood": "weird momentum",
        "description": "The output is half pitch deck, half prophecy, and all of it lands with a strange confidence.",
    },
    {
        "id": "quiet-apocalypse-marketing",
        "title": "Quiet Apocalypse Marketing",
        "mood": "modern art meets compliance",
        "description": "Everything feels expensive, wrong, and oddly right. The brand is becoming an operating system.",
    },
]


def build_prompt(page_type: str, subject: str, style: str, audience: str = "ambitious operators") -> str:
    detail = (style or "cyberpunk corporate motivational").lower()
    return (
        f"Write a {page_type} about {subject}. "
        f"Use a {detail} tone that feels cyberpunk, corporate, weird, and slightly ominous. "
        "The voice should be smart, polished, dryly funny, and emotionally sharp. "
        "Use clean boardroom language, neon imagery, and strategic motivation without sounding naive. "
        f"Target audience: {audience}. "
        "Keep the copy memorable, high-contrast, and useful as a conversion tool."
    )


def get_voice_reference() -> dict:
    return {
        "voice": VOICE_GUIDE,
        "moods": MOOD_STATES,
        "page_prompt_example": build_prompt(
            "landing_page",
            "quiet apocalypse growth loop",
            "cyberpunk corporate motivational",
        ),
    }


def get_mood_states() -> list[dict]:
    return MOOD_STATES
