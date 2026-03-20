"""Convert CRM form scripts from .js files into the fixtures JSON.

Usage:
    python -m tata_tele_service.scripts.build_fixtures
    # or from the scripts/ directory:
    python build_fixtures.py
"""

import json
from pathlib import Path

SCRIPTS_DIR = Path(__file__).parent
FIXTURES_DIR = SCRIPTS_DIR.parent / "fixtures"

# Each entry: (js filename, fixture metadata)
FORM_SCRIPTS = [
    {
        "file": "crm_lead_form.js",
        "doctype": "CRM Form Script",
        "dt": "CRM Lead",
        "name": "Click to call button in Lead",
        "view": "Form",
    },
]


def build():
    fixture_path = FIXTURES_DIR / "crm_form_script.json"

    # Load existing fixture to preserve entries we don't manage
    existing = []
    if fixture_path.exists():
        with open(fixture_path) as f:
            existing = json.loads(f.read())

    managed_names = {s["name"] for s in FORM_SCRIPTS}
    # Keep entries not managed by this script
    output = [e for e in existing if e.get("name") not in managed_names]

    for spec in FORM_SCRIPTS:
        js_path = SCRIPTS_DIR / spec["file"]
        script_content = js_path.read_text()

        entry = {
            "docstatus": 0,
            "doctype": spec["doctype"],
            "dt": spec["dt"],
            "enabled": 1,
            "is_standard": 0,
            "name": spec["name"],
            "script": script_content,
            "view": spec["view"],
        }
        output.append(entry)

    with open(fixture_path, "w") as f:
        f.write(json.dumps(output, indent=1))
        f.write("\n")

    print(f"Written {len(output)} entries to {fixture_path}")


if __name__ == "__main__":
    build()
