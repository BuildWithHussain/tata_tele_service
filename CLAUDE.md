# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This App Does

Frappe integration app for Tata Tele Service's Smartflo platform. Two features:
1. **Click-to-call** — initiate outbound calls from the desk via Smartflo API
2. **CDR sync** — cron job every 5 minutes fetches call detail records from the past 2 hours and stores them locally

## Development Environment

This is a Frappe framework app. It lives inside a bench directory and requires a running Frappe site.

```bash
# Install app on a site
bench --site <site-name> install-app tata_tele_service

# Run development server
bench start

# Run migrations after doctype changes
bench --site <site-name> migrate

# Run tests for this app
bench --site <site-name> run-tests --app tata_tele_service

# Run a single test
bench --site <site-name> run-tests --app tata_tele_service --module tata_tele_service.tata_tele_service.doctype.<doctype_name>.test_<doctype_name>

# Clear cache
bench --site <site-name> clear-cache

# Pre-commit linting (ruff, eslint, prettier)
pre-commit run --all-files
```

## Code Quality

- **Python**: Ruff for linting and formatting, 110 char line length, target Python 3.14
- **JavaScript**: ESLint + Prettier
- **Type annotations**: `export_python_type_annotations = True` and `required_type_annotated_api_methods = True` are enabled in hooks — all whitelisted API methods must have type annotations

## Architecture

### Module: Tata Tele Service

The app module lives at `tata_tele_service/tata_tele_service/` (Frappe's nested module convention).

### DocTypes

- **Tata Tele Settings** (Single) — API base URL, bearer token (Password field), default agent number, default caller ID. System Manager only.
- **Tata Tele Call Record** — stores synced CDR records. Named by `call_id` (unique). Fields: call_id, direction, status, agent_number, agent_name, customer_number, did_number, start_time, end_time, call_duration, recording_url, raw_response (JSON).

### Smartflo API Endpoints Used

- `POST /v1/click_to_call` — initiate outbound call (agent_number, destination_number, caller_id, async)
- `GET /v1/call/records` — fetch CDR with `from_date`, `to_date`, `limit`, `page` query params (date format: `yyyy-mm-dd hh:mm:ss`)

Auth: Bearer token in Authorization header.

### Key Files

- `tata_tele_service/hooks.py` — scheduler_events cron `*/5 * * * *` for CDR sync
- `tata_tele_service/tasks.py` — `sync_call_records()`: paginated CDR fetch, batch dedup by call_id, per-record error handling to Error Log
- `tata_tele_service/tata_tele_service/doctype/tata_tele_settings/tata_tele_settings.py` — `click_to_call()` whitelisted method + helper functions for headers/settings
- `tata_tele_service/tata_tele_service/doctype/tata_tele_settings/tata_tele_settings.js` — Click To Call dialog on Settings form

### CDR Sync Design

- Runs every 5 minutes via Frappe scheduler
- Fetches records from past 2 hours (hardcoded `LOOKBACK_HOURS = 2`)
- Paginates through API results (100 per page)
- Batch-fetches existing call_ids to avoid N+1 queries
- Each record insert is individually try/except'd — one bad record won't block others
- Failures logged to Error Log via `frappe.log_error()`
