import requests

import frappe
from frappe.integrations.utils import create_request_log

SERVICE_NAME = "Tata Tele Service"


def tata_tele_request(
	method: str,
	url: str,
	payload: dict | None = None,
	reference_doctype: str | None = None,
	reference_docname: str | None = None,
) -> dict:
	"""Make an API request to Tata Tele and log it as an Integration Request."""
	headers = _get_headers()

	integration_request = create_request_log(
		data=payload or {},
		service_name=SERVICE_NAME,
		url=url,
		request_headers=headers,
		reference_doctype=reference_doctype,
		reference_docname=reference_docname,
	)

	try:
		if method == "GET":
			response = requests.get(url, headers=headers, timeout=30)
		else:
			response = requests.post(
				url,
				json=payload,
				headers=headers,
				timeout=30,
			)

		response.raise_for_status()
		data = response.json()
		integration_request.handle_success(data)
		return data

	except Exception:
		integration_request.handle_failure(frappe.get_traceback())
		raise


def _get_headers() -> dict:
	settings = frappe.get_cached_doc("Tata Tele Settings")
	token = settings.get_password("access_token")
	if not token:
		frappe.throw("Tata Tele Access Token is not configured.")

	if not token.startswith("Bearer "):
		token = f"Bearer {token}"

	return {
		"Authorization": token,
		"Accept": "application/json",
		"Content-Type": "application/json",
	}
