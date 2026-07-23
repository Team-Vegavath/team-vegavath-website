"""
toc_linkify.py -- Session 42 / Section E3

Regenerates TOC links in the six file-reference wiki docs.

Slugify logic mirrors DocsContent.tsx exactly:
  str.toLowerCase()
     .replace(/\s+/g, "-")
     .replace(/[^\\w-]/g, "")
     .replace(/--+/g, "-")
     .trim()

where JS \\w = [a-zA-Z0-9_].

Only operates on files that have a plain-text TOC (not already linked).
Reports every change made so the human can verify.
"""

import re
import sys
from pathlib import Path

WIKI_DIR = Path(__file__).parent.parent / "docs" / "wiki"

TARGET_FILES = [
    "files-bootstrap-components.md",
    "files-admin-components.md",
    "files-public-components.md",
    "files-pages.md",
    "files-api.md",
    "files-middleware.md",
]


def slugify(text: str) -> str:
    """Matches DocsContent.tsx slugify exactly."""
    s = text.lower()
    s = re.sub(r"\s+", "-", s)
    s = re.sub(r"[^\w-]", "", s)   # \w = [a-zA-Z0-9_] same as JS
    s = re.sub(r"--+", "-", s)
    return s.strip()


def heading_text(line: str) -> str:
    """Strip leading '#' markers and whitespace from a heading line."""
    return re.sub(r"^#{1,6}\s+", "", line.strip())


def process_file(path: Path) -> int:
    """
    Returns the number of TOC lines replaced.
    Only replaces plain-text items (lines like '- some text' with no '[').
    """
    original = path.read_text(encoding="utf-8")
    lines = original.splitlines(keepends=True)

    # Build slug map from every heading in the file
    slug_map: dict[str, str] = {}
    for line in lines:
        stripped = line.strip()
        if re.match(r"^#{1,6}\s+", stripped):
            text = heading_text(stripped)
            slug = slugify(text)
            slug_map[text] = slug

    # Find the TOC section boundaries.
    # Accept "## Table of contents", "## Contents", "## Table of Contents" etc.
    toc_start: int | None = None
    toc_end: int | None = None
    for i, line in enumerate(lines):
        stripped = line.strip()
        if toc_start is None and re.match(
            r"^#{1,6}\s+(table of contents|contents)$", stripped, re.IGNORECASE
        ):
            toc_start = i
        elif toc_start is not None and toc_end is None:
            # TOC ends at the next heading or horizontal rule
            if re.match(r"^#{1,6}\s+", stripped) or stripped == "---":
                toc_end = i
                break

    if toc_start is None:
        print(f"  [SKIP] {path.name} -- no TOC/Contents heading found")
        return 0

    # toc_end defaults to EOF
    if toc_end is None:
        toc_end = len(lines)

    replaced = 0
    new_lines = list(lines)
    for i in range(toc_start + 1, toc_end):
        line = lines[i]
        stripped = line.rstrip("\r\n")
        # Match a plain-text bullet like "- some text" (no existing link)
        m = re.match(r"^(\s*-\s+)(.+)$", stripped)
        if not m or "[" in stripped:
            # Already a link, skip
            continue

        prefix = m.group(1)
        item_text = m.group(2).strip()

        # Try exact match first
        if item_text in slug_map:
            slug = slug_map[item_text]
        else:
            # Try matching the slug of the item text itself against computed slugs
            item_slug = slugify(item_text)
            matching = [k for k, v in slug_map.items() if v == item_slug]
            if matching:
                slug = slug_map[matching[0]]
            else:
                print(f"  [WARN] {path.name} line {i+1}: no heading match for '{item_text}'")
                continue

        eol = "\r\n" if "\r\n" in line else "\n"
        new_line = f"{prefix}[{item_text}](#{slug}){eol}"
        print(f"  [{path.name}:{i+1}] {stripped!r}")
        print(f"    -> {new_line.rstrip()!r}")
        new_lines[i] = new_line
        replaced += 1

    if replaced > 0:
        path.write_text("".join(new_lines), encoding="utf-8")
        print(f"  WROTE {path.name} ({replaced} replacements)")
    else:
        print(f"  [NO CHANGE] {path.name} -- TOC already linked or no plain-text items found")

    return replaced


def main() -> None:
    total = 0
    for name in TARGET_FILES:
        p = WIKI_DIR / name
        if not p.exists():
            print(f"[MISSING] {name}")
            continue
        print(f"\nProcessing {name} ...")
        count = process_file(p)
        total += count

    print(f"\nDone. Total TOC lines updated: {total}")


if __name__ == "__main__":
    main()
