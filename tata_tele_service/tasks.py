from datetime import datetime, timedelta

import frappe
from frappe.integrations.utils import make_get_request

LOOKBACK_HOURS = 2


@frappe.whitelist()
def enqueue_sync_call_records() -> None:
	frappe.enqueue(sync_call_records, queue="default")


def sync_call_records() -> None:
	"""Fetch call records from the past 2 hours and insert any new ones."""
	try:
		settings = frappe.get_cached_doc("Tata Tele Settings")
		if not settings.api_base_url or not settings.get_password("access_token"):
			return

		token = settings.get_password("access_token")
		if not token.startswith("Bearer "):
			token = f"Bearer {token}"

		headers = {
			"Authorization": token,
			"Accept": "application/json",
		}

		now = datetime.now()
		from_date = (now - timedelta(hours=LOOKBACK_HOURS)).strftime("%Y-%m-%d %H:%M:%S")
		to_date = now.strftime("%Y-%m-%d %H:%M:%S")

		page = 1
		while True:
			url = (
				f"{settings.api_base_url}/v1/call/records"
				f"?from_date={from_date}&to_date={to_date}&limit=100&page={page}"
			)

			data = make_get_request(url, headers=headers)

			results = data.get("results") if isinstance(data, dict) else []
			if not results:
				break

			_insert_new_records(results)

			# stop if we got fewer than a full page
			if len(results) < 100:
				break
			page += 1

		frappe.db.commit()

	except Exception:
		frappe.log_error("Tata Tele CDR Sync Error")


def _insert_new_records(records: list[dict]) -> None:
	call_ids = [r.get("call_id") for r in records if r.get("call_id")]
	if not call_ids:
		return

	existing = set(
		frappe.get_all(
			"Tata Tele Call Record",
			filters={"call_id": ["in", call_ids]},
			pluck="call_id",
		)
	)

	for rec in records:
		call_id = rec.get("call_id")
		if not call_id or call_id in existing:
			continue

		start_time = None
		if rec.get("date") and rec.get("time"):
			start_time = f"{rec['date']} {rec['time']}"

		try:
			doc = frappe.new_doc("Tata Tele Call Record")
			doc.call_id = call_id
			doc.direction = rec.get("direction")
			doc.status = rec.get("status")
			doc.agent_number = rec.get("agent_number")
			doc.agent_name = rec.get("agent_name")
			doc.customer_number = rec.get("client_number")
			doc.did_number = rec.get("did_number")
			doc.start_time = start_time
			doc.end_time = rec.get("end_stamp")
			doc.call_duration = rec.get("call_duration")
			doc.recording_url = rec.get("recording_url")
			doc.raw_response = frappe.as_json(rec)
			doc.insert(ignore_permissions=True)
			doc.submit()
		except Exception:
			frappe.log_error(f"Tata Tele CDR Insert Error: {call_id}")
