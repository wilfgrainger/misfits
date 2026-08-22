#!/usr/bin/env python3
"""One-shot, idempotent sync of the canonical 150 Misfits stories to GitHub issues.

Safety rules:
- The canonical story catalogue owns wording and acceptance criteria.
- The 22 Aug validation ledger owns VERIFIED/PARTIAL/MISSING state.
- VERIFIED stories are represented as closed/completed issues.
- PARTIAL and MISSING stories remain open.
- Existing story issues are updated in place by their ADM/PLY/PUB id.
- Hard assertions stop the sync if the expected 150 / 117 / 12 / 21 ledger shape drifts.
"""

from __future__ import annotations

import json
import os
import re
import time
import urllib.error
import urllib.request
from pathlib import Path

CATALOGUE = Path("docs/superpowers/specs/2026-08-21-user-stories.md")
VALIDATION = Path("docs/superpowers/evidence/2026-08-22-full-user-story-validation.md")

STORY_RE = re.compile(
    r"^\| \*\*((?:ADM|PLY|PUB)-\d{3})\*\* \| (.*?) \| (.*?) \| \*\*(.*?)\*\* \|$"
)
VALIDATION_RE = re.compile(
    r"^\| ((?:ADM|PLY|PUB)-\d{3}) \| \*\*(VERIFIED|PARTIAL|MISSING)\*\* \| (.*?) \|$"
)
ISSUE_ID_RE = re.compile(r"^\[((?:ADM|PLY|PUB)-\d{3})\]\s")

API = os.environ["GITHUB_API_URL"].rstrip("/")
REPO = os.environ["GITHUB_REPOSITORY"]
TOKEN = os.environ["GH_TOKEN"]


def api(method: str, path: str, payload: dict | None = None):
    data = None if payload is None else json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        f"{API}{path}",
        data=data,
        method=method,
        headers={
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {TOKEN}",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "misfits-user-story-sync",
            **({"Content-Type": "application/json"} if data is not None else {}),
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as response:
            raw = response.read()
            return json.loads(raw) if raw else None
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"GitHub API {method} {path} failed: {exc.code} {body}") from exc


def parse_catalogue():
    stories: dict[str, dict[str, str]] = {}
    for line in CATALOGUE.read_text(encoding="utf-8").splitlines():
        match = STORY_RE.match(line)
        if not match:
            continue
        story_id, story, acceptance, state = match.groups()
        if story_id in stories:
            raise RuntimeError(f"Duplicate canonical story id: {story_id}")
        stories[story_id] = {
            "story": story.strip(),
            "acceptance": acceptance.strip(),
            "catalogue_state": state.strip(),
        }
    return stories


def parse_validation():
    validation: dict[str, dict[str, str]] = {}
    for line in VALIDATION.read_text(encoding="utf-8").splitlines():
        match = VALIDATION_RE.match(line)
        if not match:
            continue
        story_id, status, evidence = match.groups()
        validation[story_id] = {"status": status, "evidence": evidence.strip()}
    return validation


def all_existing_story_issues():
    found: dict[str, dict] = {}
    page = 1
    while True:
        rows = api("GET", f"/repos/{REPO}/issues?state=all&per_page=100&page={page}")
        if not rows:
            break
        for row in rows:
            if "pull_request" in row:
                continue
            title = row.get("title", "")
            match = ISSUE_ID_RE.match(title)
            if not match:
                continue
            story_id = match.group(1)
            if story_id in found:
                raise RuntimeError(f"Duplicate existing story issues for {story_id}")
            found[story_id] = row
        if len(rows) < 100:
            break
        page += 1
    return found


def clean_markdown(text: str) -> str:
    return text.replace("\\|", "|").strip()


def issue_title(story_id: str, story: str) -> str:
    prefix = f"[{story_id}] "
    value = clean_markdown(story)
    max_story = 250 - len(prefix)
    if len(value) > max_story:
        value = value[: max_story - 1].rstrip() + "…"
    return prefix + value


def issue_body(story_id: str, story: dict[str, str], validation: dict[str, str]) -> str:
    status = validation["status"]
    lifecycle = "Closed as completed" if status == "VERIFIED" else "Open for future validation/delivery"
    return f"""## Canonical user story

{clean_markdown(story['story'])}

## Acceptance criteria

{clean_markdown(story['acceptance'])}

## Catalogue metadata

- Story ID: `{story_id}`
- Canonical catalogue state: **{clean_markdown(story['catalogue_state'])}**
- 22 August evidence audit: **{status}**
- Issue lifecycle: **{lifecycle}**

## Current validation evidence / gap

{clean_markdown(validation['evidence'])}

## Authorities

- Story wording and acceptance: `docs/superpowers/specs/2026-08-21-user-stories.md`
- Current completion state: `docs/superpowers/evidence/2026-08-22-full-user-story-validation.md`
- Durable handoff: `PROGRESS.md`

---

This issue is an operational mirror of the canonical user-story catalogue. A later validation job may add comments/evidence to open issues, but should not silently weaken the acceptance criteria to make an issue pass.
"""


def write_summary(counts: dict[str, int], issue_numbers: dict[str, int]):
    path = os.environ.get("GITHUB_STEP_SUMMARY")
    if not path:
        return
    open_ids = sorted(story_id for story_id, status in issue_numbers.items() if False)
    with open(path, "a", encoding="utf-8") as handle:
        handle.write("# User-story issue sync\n\n")
        handle.write(f"- Created: {counts['created']}\n")
        handle.write(f"- Updated: {counts['updated']}\n")
        handle.write(f"- Closed/VERIFIED: {counts['verified']}\n")
        handle.write(f"- Open/PARTIAL: {counts['partial']}\n")
        handle.write(f"- Open/MISSING: {counts['missing']}\n")
        handle.write(f"- Total story issues: {len(issue_numbers)}\n")


def main():
    stories = parse_catalogue()
    validation = parse_validation()

    if len(stories) != 150:
        raise RuntimeError(f"Expected 150 canonical stories, found {len(stories)}")
    if set(stories) != set(validation):
        missing_validation = sorted(set(stories) - set(validation))
        extra_validation = sorted(set(validation) - set(stories))
        raise RuntimeError(
            f"Story/validation mismatch. Missing validation={missing_validation}; extra validation={extra_validation}"
        )

    expected = {"VERIFIED": 117, "PARTIAL": 12, "MISSING": 21}
    actual = {key: sum(1 for row in validation.values() if row["status"] == key) for key in expected}
    if actual != expected:
        raise RuntimeError(f"Validation ledger shape changed: expected {expected}, found {actual}")

    existing = all_existing_story_issues()
    counts = {"created": 0, "updated": 0, "verified": 0, "partial": 0, "missing": 0}
    issue_numbers: dict[str, int] = {}

    for index, story_id in enumerate(sorted(stories), start=1):
        story = stories[story_id]
        verdict = validation[story_id]
        title = issue_title(story_id, story["story"])
        body = issue_body(story_id, story, verdict)
        row = existing.get(story_id)

        if row is None:
            row = api("POST", f"/repos/{REPO}/issues", {"title": title, "body": body})
            counts["created"] += 1
            time.sleep(0.8)
        else:
            desired_state = "closed" if verdict["status"] == "VERIFIED" else "open"
            if row.get("title") != title or row.get("body") != body or row.get("state") != desired_state:
                patch = {"title": title, "body": body}
                if row.get("state") != desired_state:
                    patch["state"] = desired_state
                    patch["state_reason"] = "completed" if desired_state == "closed" else "reopened"
                row = api("PATCH", f"/repos/{REPO}/issues/{row['number']}", patch)
                counts["updated"] += 1
                time.sleep(0.8)

        if verdict["status"] == "VERIFIED" and row.get("state") != "closed":
            row = api(
                "PATCH",
                f"/repos/{REPO}/issues/{row['number']}",
                {"state": "closed", "state_reason": "completed"},
            )
            time.sleep(0.8)
        elif verdict["status"] != "VERIFIED" and row.get("state") != "open":
            row = api(
                "PATCH",
                f"/repos/{REPO}/issues/{row['number']}",
                {"state": "open", "state_reason": "reopened"},
            )
            time.sleep(0.8)

        counts[verdict["status"].lower()] += 1
        issue_numbers[story_id] = int(row["number"])
        print(f"[{index:03d}/150] {story_id} -> #{row['number']} {verdict['status']} {row.get('state')}")

    final_existing = all_existing_story_issues()
    final_story_issues = {story_id: row for story_id, row in final_existing.items() if story_id in stories}
    if len(final_story_issues) != 150:
        raise RuntimeError(f"Expected 150 story issues after sync, found {len(final_story_issues)}")

    final_open = sorted(story_id for story_id, row in final_story_issues.items() if row.get("state") == "open")
    expected_open = sorted(story_id for story_id, row in validation.items() if row["status"] != "VERIFIED")
    if final_open != expected_open:
        raise RuntimeError(f"Open issue set does not match incomplete ledger. Expected {expected_open}; found {final_open}")

    write_summary(counts, issue_numbers)
    print(json.dumps({"counts": counts, "open": final_open}, indent=2))


if __name__ == "__main__":
    main()
