import requests

import frappe
from frappe import _
from frappe.model.document import Document

STATUS_MAP = {
	"answered": "Completed",
	"answered by customer": "Completed",
	"missed": "No Answer",
	"missed by customer": "No Answer",
	"missed by agent (click to call)": "No Answer",
	"busy": "Busy",
	"declined": "Canceled",
	"voicemail": "Completed",
}


class TataTeleCallRecord(Document):
	def on_submit(self) -> None:
		try:
			_download_recording(self)
		except Exception:
			frappe.log_error(f"Tata Tele Recording Download Error: {self.call_id}")

		_create_crm_call_log(self)


def _create_crm_call_log(doc: Document) -> None:
	is_incoming = doc.direction == "inbound"

	call_log = frappe.get_doc(
		{
			"doctype": "CRM Call Log",
			"id": doc.call_id,
			"type": "Incoming" if is_incoming else "Outgoing",
			"status": STATUS_MAP.get(doc.status, "Completed"),
			"from": doc.customer_number if is_incoming else doc.agent_number,
			"to": doc.agent_number if is_incoming else doc.customer_number,
			"start_time": doc.start_time,
			"end_time": doc.end_time,
			"duration": doc.call_duration,
			"recording_url": doc.recording_url or "",
			"telephony_medium": "Manual",
		}
	)
	call_log.insert(ignore_permissions=True)

	# auto-link with Lead/Deal using the same pattern as Twilio/Exotel
	try:
		from crm.integrations.api import get_contact_by_phone_number

		contact_number = doc.customer_number
		if contact_number:
			contact = get_contact_by_phone_number(contact_number)
			if contact.get("name"):
				doctype = "Contact"
				docname = contact["name"]
				if contact.get("lead"):
					doctype = "CRM Lead"
					docname = contact["lead"]
				elif contact.get("deal"):
					doctype = "CRM Deal"
					docname = contact["deal"]
				call_log.link_with_reference_doc(doctype, docname)
				call_log.save(ignore_permissions=True)
	except Exception:
		pass

	doc.db_set("crm_call_log", call_log.name)


def _download_recording(doc: Document) -> None:
	if not doc.recording_url:
		return

	settings = frappe.get_cached_doc("Tata Tele Settings")
	token = settings.get_password("access_token")
	if not token:
		return

	if not token.startswith("Bearer "):
		token = f"Bearer {token}"

	response = requests.get(
		doc.recording_url,
		headers={"Authorization": token},
		timeout=30,
	)
	response.raise_for_status()

	content_type = response.headers.get("Content-Type", "")
	ext = "mp3" if "mpeg" in content_type else "wav"
	filename = f"{doc.call_id}.{ext}"

	file_doc = frappe.get_doc(
		{
			"doctype": "File",
			"file_name": filename,
			"content": response.content,
			"attached_to_doctype": doc.doctype,
			"attached_to_name": doc.name,
			"is_private": 1,
		}
	)
	file_doc.save(ignore_permissions=True)
	doc.db_set("call_recording", file_doc.file_url)


@frappe.whitelist()
def fetch_call_recording(name: str) -> None:
	doc = frappe.get_doc("Tata Tele Call Record", name)

	if doc.docstatus != 1:
		frappe.throw(_("Record must be submitted first."))
	if doc.call_recording:
		frappe.throw(_("Recording already attached."))
	if not doc.recording_url:
		frappe.throw(_("No recording URL available for this call."))

	try:
		_download_recording(doc)
	except Exception:
		frappe.log_error(f"Tata Tele Recording Download Error: {doc.call_id}")
		frappe.throw(_("Failed to fetch recording. Check Error Log for details."))
