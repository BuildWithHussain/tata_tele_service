import frappe
from frappe import _
from frappe.model.document import Document

from tata_tele_service.api import tata_tele_request


class TataTeleSettings(Document):
	pass


def get_settings() -> Document:
	settings = frappe.get_cached_doc("Tata Tele Settings")
	if not settings.api_base_url:
		frappe.throw(_("Tata Tele API Base URL is not configured."))
	return settings


@frappe.whitelist()
def click_to_call(
	destination_number: str,
	agent_number: str | None = None,
	caller_id: str | None = None,
) -> dict:
	settings = get_settings()

	user_mobile = frappe.db.get_value("User", frappe.session.user, "mobile_no")
	if not user_mobile:
		frappe.throw(_("Mobile number not set in your User profile."))

	agent = agent_number or user_mobile
	caller = caller_id or settings.default_caller_id

	if not agent:
		frappe.throw(_("Agent number is not configured."))
	if not caller:
		frappe.throw(_("Caller ID is not configured."))

	url = f"{settings.api_base_url}/v1/click_to_call"
	payload = {
		"async": 1,
		"agent_number": agent,
		"destination_number": destination_number,
		"caller_id": caller,
	}

	response = tata_tele_request("POST", url, payload)
	return {"status": "success", "data": response}
