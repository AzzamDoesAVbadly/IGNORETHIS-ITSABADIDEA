#!/usr/bin/env python3
from __future__ import annotations

import json
import os
from pathlib import Path

ROOT = Path(os.environ.get("AI_BUSINESS_HOME", Path.home() / "AI-Business"))


def validate_report(report: dict) -> dict:
    errors = []
    for key in ["topic", "summary", "path"]:
        if not report.get(key):
            errors.append(f"missing {key}")
    if len(report.get("summary", "")) < 80:
        errors.append("summary too short")
    if not Path(report.get("path", "")).exists():
        errors.append("report file missing")

    return {
        "ok": not errors,
        "errors": errors,
        "checked": report,
    }


def run(report: dict) -> dict:
    return validate_report(report)
