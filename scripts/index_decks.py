#!/usr/bin/env python3
"""
scripts/index_decks.py

Scans the questions/ directory for all *.json question decks (excluding decks.json),
analyzes each deck (question count, unique categories, title patterns), infers
sensible metadata (icon, deck category, badge text), and updates questions/decks.json.

Run this whenever a new deck is added to instantly make it available in the game:
    python3 scripts/index_decks.py
"""

import json
import os
import re
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
QUESTIONS_DIR = ROOT_DIR / "questions"
DECKS_MANIFEST_PATH = QUESTIONS_DIR / "decks.json"

ICON_KEYWORDS = [
    (r"\bpython\b", "🐍"),
    (r"\b(postgres|postgresql|sql|sqlite|mysql|mariadb)\b", "🐘"),
    (r"\brust\b", "🦀"),
    (r"\b(javascript|js|node|nodejs)\b", "🟨"),
    (r"\b(typescript|ts)\b", "🔷"),
    (r"\b(golang|go)\b", "🐹"),
    (r"\b(java|jvm)\b", "☕"),
    (r"\b(c\+\+|cpp)\b", "⚡"),
    (r"\b(csharp|c#|\.net|dotnet)\b", "🟣"),
    (r"\bruby\b", "💎"),
    (r"\bphp\b", "🐘"),
    (r"\bswift\b", "🐦"),
    (r"\bkotlin\b", "🎯"),
    (r"\b(html|css|frontend|web)\b", "🌐"),
    (r"\b(linux|bash|shell|unix)\b", "🐧"),
    (r"\b(docker|kubernetes|k8s|container)\b", "🐳"),
    (r"\b(git|github)\b", "🐙"),
    (r"\b(aws|cloud|azure|gcp)\b", "☁️"),
    (r"\b(security|crypto|auth)\b", "🔒"),
    (r"\b(ai|ml|machine\s*learning|deep\s*learning)\b", "🤖"),
    (r"\b(http|status|codes?)\b", "🌐"),
    (r"\b(pattern|patterns|architecture|design)\b", "📐"),
    (r"\b(network|networking|tcp)\b", "📡"),
]

CATEGORY_KEYWORDS = [
    (r"\b(postgres|postgresql|sql|sqlite|mysql|mongo|redis|database|db)\b", "Databases"),
    (r"\b(python|rust|javascript|typescript|golang|java|c\+\+|cpp|csharp|ruby|php|swift|kotlin)\b", "Languages"),
    (r"\b(http|status|codes?|rest|api|network|networking|tcp)\b", "Web & Networking"),
    (r"\b(pattern|patterns|architecture|gof|system\s*design)\b", "Software Architecture"),
    (r"\b(html|css|react|vue|angular|frontend|web)\b", "Web & Frontend"),
    (r"\b(docker|kubernetes|k8s|linux|bash|devops|aws|cloud|ci/cd|terraform)\b", "DevOps & Cloud"),
    (r"\b(algorithm|data\s*structures?|math|cs|computer\s*science)\b", "Computer Science"),
    (r"\b(security|auth|cryptography|owasp)\b", "Security"),
    (r"\b(ai|ml|data\s*science|pandas|numpy)\b", "AI & Data"),
]

def infer_icon(text: str) -> str:
    text_lower = text.lower()
    for pattern, icon in ICON_KEYWORDS:
        if re.search(pattern, text_lower):
            return icon
    return "💾"

def infer_category(text: str) -> str:
    text_lower = text.lower()
    for pattern, cat in CATEGORY_KEYWORDS:
        if re.search(pattern, text_lower):
            return cat
    return "General"

def format_title_from_stem(stem: str) -> str:
    if stem == "http_status_codes":
        return "HTTP Status Codes & Semantics"
    if stem == "design_patterns":
        return "Software Design Patterns"
    clean = stem.replace("_", " ").replace("-", " ")
    words = clean.split()
    formatted = []
    acronyms = {"sql", "dql", "dml", "ddl", "oop", "api", "css", "html", "aws", "gcp", "k8s", "db", "js", "ts", "ai", "ml", "http"}
    for w in words:
        if w.lower() in acronyms:
            formatted.append(w.upper())
        elif w.lower() == "postgresql":
            formatted.append("PostgreSQL")
        else:
            formatted.append(w.capitalize())
    return " ".join(formatted)

def main():
    if not QUESTIONS_DIR.exists():
        print(f"Error: {QUESTIONS_DIR} does not exist.")
        return

    # Load existing manifest to preserve manual custom edits
    existing_decks = {}
    if DECKS_MANIFEST_PATH.exists():
        try:
            with open(DECKS_MANIFEST_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list):
                    for item in data:
                        if "id" in item:
                            existing_decks[item["id"]] = item
        except Exception as e:
            print(f"Notice: Could not parse existing decks.json: {e}")

    scanned_decks = []
    json_files = sorted(QUESTIONS_DIR.glob("*.json"))

    for filepath in json_files:
        filename = filepath.name
        if filename in ("decks.json", "index.json"):
            continue

        deck_id = filepath.stem
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                content = json.load(f)
        except Exception as e:
            print(f"Warning: Skipping {filename} (invalid JSON: {e})")
            continue

        if not isinstance(content, list) or len(content) == 0:
            print(f"Warning: Skipping {filename} (not a non-empty array)")
            continue

        q_count = len(content)
        categories = sorted({q.get("category", "General") for q in content if isinstance(q, dict)})

        existing = existing_decks.get(deck_id, {})

        name = existing.get("name") or format_title_from_stem(deck_id)
        icon = existing.get("icon") or infer_icon(f"{deck_id} {name}")
        category = existing.get("category") or infer_category(f"{deck_id} {name}")
        if "http" in deck_id:
            badge_text = existing.get("badgeText") or "⚡ HTTP RESPONSE EXAMPLE"
        elif "pattern" in deck_id:
            badge_text = existing.get("badgeText") or "⚡ DESIGN PATTERN EXAMPLE"
        else:
            badge_text = existing.get("badgeText") or f"⚡ {name.upper()} EXAMPLE"
        
        sample_cats = ", ".join(categories[:3])
        if len(categories) > 3:
            sample_cats += f" +{len(categories)-3} more"

        default_desc = f"{q_count} questions covering {sample_cats}"
        description = existing.get("description") or default_desc

        entry = {
            "id": deck_id,
            "name": name,
            "file": filename,
            "icon": icon,
            "category": category,
            "badgeText": badge_text,
            "questionCount": q_count,
            "description": description
        }

        scanned_decks.append(entry)

    # Sort decks: Databases & Languages first, then by name
    scanned_decks.sort(key=lambda d: (0 if d["id"] in ("postgresql", "python") else 1, d["name"]))

    with open(DECKS_MANIFEST_PATH, "w", encoding="utf-8") as f:
        json.dump(scanned_decks, f, indent=2, ensure_ascii=False)
        f.write("\n")

    print(f"✅ Indexed {len(scanned_decks)} deck(s) into {DECKS_MANIFEST_PATH}:")
    for d in scanned_decks:
        print(f"  • {d['icon']} {d['name']} ({d['questionCount']} Qs) [{d['category']}] -> {d['file']}")

if __name__ == "__main__":
    main()
