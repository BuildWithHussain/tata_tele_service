import frappe
from frappe import _
from frappe.integrations.utils import make_get_request, make_post_request
from frappe.model.document import Document


class TataTeleSettings(Document):
	pass


def get_settings() -> Document:
	settings = frappe.get_cached_doc("Tata Tele Settings")
	if not settings.api_base_url:
		frappe.throw(_("Tata Tele API Base URL is not configured."))
	return settings


def get_headers() -> dict:
	settings = frappe.get_cached_doc("Tata Tele Settings")
	token = settings.get_password("access_token")
	if not token:
		frappe.throw(_("Tata Tele Access Token is not configured."))

	if not token.startswith("Bearer "):
		token = f"Bearer {token}"

	return {
		"Authorization": token,
		"Accept": "application/json",
		"Content-Type": "application/json",
	}


@frappe.whitelist()
def click_to_call(
	destination_number: str,
	agent_number: str | None = None,
	caller_id: str | None = None,
) -> dict:
	settings = get_settings()
	headers = get_headers()

	agent = agent_number or settings.default_agent_number
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

	response = make_post_request(url, data=frappe.as_json(payload), headers=headers)
	return {"status": "success", "data": response}
