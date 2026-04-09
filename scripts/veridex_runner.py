#!/usr/bin/env python3
import argparse
import datetime as dt
import glob
import json
import re
from pathlib import Path

TASK_LINE_RE = re.compile(r"Task\s+(\d{3})", re.IGNORECASE)
HEADER_RE = re.compile(r"^#\s+Task\s+(\d{3})\s+[^\w]*(.+?)\s*$")
META_RE = re.compile(r"^(Status|Owner|Support|Priority|Assigned By|Assigned To):\s*(.*)$")
SECTION_RE = re.compile(r"^##\s+(.*)$")


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def normalize_text(text: str) -> str:
    return text.replace("\u2014", "-").replace("\u2013", "-")


def parse_active_tasks(path: Path):
    section = "Uncategorized"
    tasks = []
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = normalize_text(raw_line).strip()
        if not line:
            continue
        if line.startswith("## "):
            section = line[3:].strip()
            continue
        match = TASK_LINE_RE.search(line)
        if match:
            tasks.append({"task_number": match.group(1), "task_id": f"task-{match.group(1)}", "queue_section": section})
    return tasks


def parse_task_file(path: Path):
    lines = path.read_text(encoding="utf-8").splitlines()
    metadata = {}
    sections = {}
    current_section = None
    for idx, raw_line in enumerate(lines):
        line = raw_line.rstrip()
        normalized = normalize_text(line)
        if idx == 0:
            header_match = HEADER_RE.match(normalized)
            if header_match:
                metadata["task_number"] = header_match.group(1)
                metadata["title"] = header_match.group(2).strip()
        meta_match = META_RE.match(normalized)
        if meta_match and current_section is None:
            key = meta_match.group(1)
            if key not in metadata:
                metadata[key] = meta_match.group(2).strip()
            continue
        section_match = SECTION_RE.match(normalized)
        if section_match:
            current_section = section_match.group(1).strip()
            sections[current_section] = []
            continue
        if current_section:
            sections[current_section].append(line)
    metadata["sections"] = {key: "\n".join(value).strip() for key, value in sections.items()}
    metadata["task_id"] = path.stem
    metadata["file_path"] = path.as_posix()
    return metadata


def resolve_task_file(root: Path, tasks_dir: str, task_number: str):
    matches = sorted((root / tasks_dir).glob(f"task-{task_number}-*.md"))
    if not matches:
        raise SystemExit(f"Missing task file for task-{task_number} in {(root / tasks_dir)}")
    return matches[0]


def glob_matches(root: Path, patterns):
    matches = []
    for pattern in patterns:
        full_pattern = str(root / pattern)
        for match in glob.glob(full_pattern, recursive=True):
            path = Path(match)
            if path.is_file():
                rel = path.relative_to(root).as_posix()
                if rel not in matches and not rel.startswith(".veridex/reviews/"):
                    matches.append(rel)
    return matches


def determine_targets(root: Path, task, targeting, max_target_files):
    explicit = []
    for rule in targeting.get("task_rules", []):
        if rule.get("task_id") == task["task_id"].split("-")[0] + "-" + task["task_id"].split("-")[1]:
            explicit.extend(rule.get("targets", []))
    owner = task.get("Owner", "")
    defaults = targeting.get("owner_defaults", {}).get(owner, [])
    return glob_matches(root, explicit + defaults)[:max_target_files]


def render_bullets(text):
    if not text:
        return "- None"
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    if not lines:
        return "- None"
    if all(line.startswith("-") for line in lines):
        return "\n".join(lines)
    return "\n".join(f"- {line}" for line in lines)


def review_packet(task, targets):
    target_lines = "\n".join(f"- {item}" for item in targets) if targets else "- No matches found"
    return "\n".join([
        f"# Review Packet - {task['task_id']}",
        "",
        "## Task",
        task.get("title", task["task_id"]),
        "",
        "## Owner",
        task.get("Owner", "Unknown"),
        "",
        "## Support",
        task.get("Support", "None"),
        "",
        "## Priority",
        task.get("Priority", "Unspecified"),
        "",
        "## Status",
        task.get("Status", "Unknown"),
        "",
        "## Goal",
        task["sections"].get("Goal", "") or "Not specified",
        "",
        "## Requirements",
        render_bullets(task["sections"].get("Requirements", "")),
        "",
        "## Target Files",
        target_lines,
        "",
        "## Execution Plan",
        "- Read the task file and current target files.",
        "- Confirm ownership, scope, and constraints before editing.",
        "- Produce a human review packet before code changes.",
        "",
        "## Validation Checklist",
        render_bullets(task["sections"].get("Validation", "")),
        "",
        "## Notes",
        task["sections"].get("Notes", "") or "None",
        ""
    ])


def update_status_in_file(path: Path, new_status: str):
    lines = path.read_text(encoding="utf-8").splitlines()
    updated = []
    replaced = False
    for line in lines:
        if not replaced and line.startswith("Status:"):
            updated.append(f"Status: {new_status}")
            replaced = True
        else:
            updated.append(line)
    path.write_text("\n".join(updated) + "\n", encoding="utf-8")


def append_worklog(path: Path, record: dict):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(record) + "\n")


def base_task_id(task_file_stem: str):
    parts = task_file_stem.split("-")
    return "-".join(parts[:2])


def main():
    parser = argparse.ArgumentParser(description="Generate Veridex review packets from active tasks.")
    parser.add_argument("--root", default=".")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    root = Path(args.root).resolve()
    automation = load_json(root / ".veridex" / "config" / "automation.json")
    targeting = load_json(root / automation["file_targeting_file"])
    active_tasks = parse_active_tasks(root / automation["active_tasks_file"])
    if not active_tasks:
        raise SystemExit("No active tasks found.")

    results = []
    for entry in active_tasks:
        task_file = resolve_task_file(root, automation["tasks_dir"], entry["task_number"])
        task = parse_task_file(task_file)
        task["queue_section"] = entry["queue_section"]
        task["base_task_id"] = base_task_id(task["task_id"])
        targets = determine_targets(root, {**task, "task_id": task["base_task_id"]}, targeting, automation["max_target_files"])
        review_dir = root / automation["reviews_dir"] / task["task_id"]
        review_path = review_dir / "review-packet.md"
        if not args.dry_run:
            review_dir.mkdir(parents=True, exist_ok=True)
            review_path.write_text(review_packet(task, targets), encoding="utf-8")
            if task["queue_section"].lower() == "now" and task.get("Status") == "Pending":
                update_status_in_file(task_file, automation["default_status_on_run"])
                task["Status"] = automation["default_status_on_run"]
            append_worklog(root / automation["worklog_file"], {
                "timestamp": dt.datetime.now(dt.timezone.utc).isoformat(),
                "task_id": task["task_id"],
                "queue_section": task["queue_section"],
                "status": task.get("Status", ""),
                "review_packet": review_path.relative_to(root).as_posix(),
                "target_files": targets
            })
        results.append({
            "task_id": task["task_id"],
            "status": task.get("Status", ""),
            "queue_section": task["queue_section"],
            "review_packet": review_path.relative_to(root).as_posix(),
            "target_files": targets
        })

    print(json.dumps({"ok": True, "tasks": results}, indent=2))


if __name__ == "__main__":
    main()
