#!/usr/bin/env python3
from __future__ import annotations

import json
import os
from pathlib import Path

ROOT = Path(os.environ.get("AI_BUSINESS_HOME", Path.home() / "AI-Business"))


def build_image_prompt(subject: str, style: str = "cyberpunk corporate surreal") -> dict:
    subject_text = (subject or "quiet apocalypse marketing").strip() or "quiet apocalypse marketing"
    style_text = (style or "cyberpunk corporate surreal").strip() or "cyberpunk corporate surreal"
    prompt = (
        f"{subject_text}, cinematic, ultra-detailed, dark neon palette, corporate surrealism, "
        f"{style_text}, glossy surfaces, soft fog, high-end editorial composition, realistic lighting, high contrast"
    )
    return {
        "provider": "local-prompt",
        "subject": subject_text,
        "style": style_text,
        "prompt": prompt,
        "notes": [
            "Built for a weird corporate-art environment.",
            "The image should feel like a product mockup and a nightmare at the same time.",
        ],
    }


def run(subject: str = "quiet apocalypse marketing") -> dict:
    return build_image_prompt(subject)
