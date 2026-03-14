const TTS_MODULE =
	"tata_tele_service.tata_tele_service.doctype.tata_tele_settings.tata_tele_settings";

frappe.ui.form.on("Tata Tele Settings", {
	refresh(frm) {
		frm.add_custom_button(__("Click To Call"), () => {
			const dialog = new frappe.ui.Dialog({
				title: __("Click To Call"),
				size: "small",
				fields: [
					{
						label: __("Agent Number"),
						fieldname: "agent_number",
						fieldtype: "Data",
						reqd: 1,
						default: frm.doc.default_agent_number || "",
					},
					{
						label: __("Destination Number"),
						fieldname: "destination_number",
						fieldtype: "Data",
						reqd: 1,
					},
					{
						label: __("Caller ID"),
						fieldname: "caller_id",
						fieldtype: "Data",
						default: frm.doc.default_caller_id || "",
					},
				],
				primary_action_label: __("Call"),
				primary_action(values) {
					frappe.call({
						method: `${TTS_MODULE}.click_to_call`,
						args: values,
						callback(r) {
							if (r.message?.status === "success") {
								frappe.show_alert({
									message: __("Call initiated successfully"),
									indicator: "green",
								});
							}
						},
					});
					dialog.hide();
				},
			});
			dialog.show();
		}).addClass("btn-primary");
	},
});
