#!/usr/bin/env python3
from __future__ import annotations

import os
from pathlib import Path

ROOT = Path(os.environ.get("AI_BUSINESS_HOME", Path.home() / "AI-Business"))


def build_video_storyboard(subject: str = "quiet apocalypse growth loop") -> dict:
    subject_text = (subject or "quiet apocalypse growth loop").strip() or "quiet apocalypse growth loop"
    shots = [
        "An ultra-clean corporate lobby fills with static and flickering neon signage.",
        "A calm narrator explains that traction is just attention with a better wardrobe.",
        "The camera glides through a dark boardroom while charts and ghostly metrics bloom across the walls.",
        "A surreal mascot made of glass, code, and office furniture appears in the final frame with a confident grin.",
    ]
    return {
        "provider": "local-storyboard",
        "subject": subject_text,
        "title": "Quiet Apocalypse: The Signal in the Hallway",
        "shots": shots,
        "style": "cyberpunk corporate motivational, eerie but polished, cinematic and deterministic",
    }


def run(subject: str = "quiet apocalypse growth loop") -> dict:
    return build_video_storyboard(subject)
