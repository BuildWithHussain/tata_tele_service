frappe.ui.form.on("Tata Tele Call Record", {
	refresh(frm) {
		if (frm.doc.docstatus === 1 && frm.doc.recording_url && !frm.doc.call_recording) {
			frm.add_custom_button(__("Fetch Call Recording"), () => {
				frappe.call({
					method: "tata_tele_service.tata_tele_service.doctype.tata_tele_call_record.tata_tele_call_record.fetch_call_recording",
					args: { name: frm.doc.name },
					callback() {
						frappe.show_alert({
							message: __("Recording fetched"),
							indicator: "green",
						});
						frm.reload_doc();
					},
				});
			});
		}
	},
});
