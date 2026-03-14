import requests

import frappe
from frappe import _
from frappe.model.document import Document


class TataTeleCallRecord(Document):
	def on_submit(self) -> None:
		_download_recording(self)


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
