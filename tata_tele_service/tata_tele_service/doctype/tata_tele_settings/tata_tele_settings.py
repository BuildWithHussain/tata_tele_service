import frappe
from frappe import _
from frappe.model.document import Document

from tata_tele_service.api import tata_tele_request


class TataTeleSettings(Document):
	def validate(self):
		self.validate_duplicate_companies()

	def validate_duplicate_companies(self):
		seen = set()
		for row in self.company_caller_ids or []:
			if row.company in seen:
				frappe.throw(
					_("Row {0}: Company {1} already has a Caller ID configured.").format(
						row.idx, frappe.bold(row.company)
					)
				)
			seen.add(row.company)


def get_settings() -> Document:
	settings = frappe.get_cached_doc("Tata Tele Settings")
	if not settings.api_base_url:
		frappe.throw(_("Tata Tele API Base URL is not configured."))
	return settings


def get_caller_id_for_user(settings: Document) -> str | None:
	"""Resolve Caller ID: User → Employee → Company → child table DID."""
	employee_company = frappe.db.get_value(
		"Employee", {"user_id": frappe.session.user, "status": "Active"}, "company"
	)
	if not employee_company:
		return None

	for row in settings.company_caller_ids or []:
		if row.company == employee_company:
			return row.caller_id

	return None


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
	caller = caller_id or get_caller_id_for_user(settings) or settings.default_caller_id

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
