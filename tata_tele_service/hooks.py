app_name = "tata_tele_service"
app_title = "Tata Tele Service"
app_publisher = "developers@buildwithhussain.com"
app_description = "Integration for Tata Tele Service"
app_email = "developers@buildwithhussain.com"
app_license = "mit"

fixtures = [
	{
		"dt": "CRM Form Script",
		"filters": [["name", "in", ["Click to call button in Lead"]]],
	},
]

# Apps
# ------------------

# required_apps = []

# Each item in the list will be shown as an app in the apps page
# add_to_apps_screen = [
# 	{
# 		"name": "tata_tele_service",
# 		"logo": "/assets/tata_tele_service/logo.png",
# 		"title": "Tata Tele Service",
# 		"route": "/tata_tele_service",
# 		"has_permission": "tata_tele_service.api.permission.has_app_permission"
# 	}
# ]

# Includes in <head>
# ------------------

# include js, css files in header of desk.html
# app_include_css = "/assets/tata_tele_service/css/tata_tele_service.css"
# app_include_js = "/assets/tata_tele_service/js/tata_tele_service.js"

# include js, css files in header of web template
# web_include_css = "/assets/tata_tele_service/css/tata_tele_service.css"
# web_include_js = "/assets/tata_tele_service/js/tata_tele_service.js"

# include custom scss in every website theme (without file extension ".scss")
# website_theme_scss = "tata_tele_service/public/scss/website"

# include js, css files in header of web form
# webform_include_js = {"doctype": "public/js/doctype.js"}
# webform_include_css = {"doctype": "public/css/doctype.css"}

# include js in page
# page_js = {"page" : "public/js/file.js"}

# include js in doctype views
# doctype_js = {"doctype" : "public/js/doctype.js"}
# doctype_list_js = {"doctype" : "public/js/doctype_list.js"}
# doctype_tree_js = {"doctype" : "public/js/doctype_tree.js"}
# doctype_calendar_js = {"doctype" : "public/js/doctype_calendar.js"}

# Svg Icons
# ------------------
# include app icons in desk
# app_include_icons = "tata_tele_service/public/icons.svg"

# Home Pages
# ----------

# application home page (will override Website Settings)
# home_page = "login"

# website user home page (by Role)
# role_home_page = {
# 	"Role": "home_page"
# }

# Generators
# ----------

# automatically create page for each record of this doctype
# website_generators = ["Web Page"]

# automatically load and sync documents of this doctype from downstream apps
# importable_doctypes = [doctype_1]

# Jinja
# ----------

# add methods and filters to jinja environment
# jinja = {
# 	"methods": "tata_tele_service.utils.jinja_methods",
# 	"filters": "tata_tele_service.utils.jinja_filters"
# }

# Installation
# ------------

# before_install = "tata_tele_service.install.before_install"
# after_install = "tata_tele_service.install.after_install"

# Uninstallation
# ------------

# before_uninstall = "tata_tele_service.uninstall.before_uninstall"
# after_uninstall = "tata_tele_service.uninstall.after_uninstall"

# Integration Setup
# ------------------
# To set up dependencies/integrations with other apps
# Name of the app being installed is passed as an argument

# before_app_install = "tata_tele_service.utils.before_app_install"
# after_app_install = "tata_tele_service.utils.after_app_install"

# Integration Cleanup
# -------------------
# To clean up dependencies/integrations with other apps
# Name of the app being uninstalled is passed as an argument

# before_app_uninstall = "tata_tele_service.utils.before_app_uninstall"
# after_app_uninstall = "tata_tele_service.utils.after_app_uninstall"

# Desk Notifications
# ------------------
# See frappe.core.notifications.get_notification_config

# notification_config = "tata_tele_service.notifications.get_notification_config"

# Permissions
# -----------
# Permissions evaluated in scripted ways

# permission_query_conditions = {
# 	"Event": "frappe.desk.doctype.event.event.get_permission_query_conditions",
# }
#
# has_permission = {
# 	"Event": "frappe.desk.doctype.event.event.has_permission",
# }

# Document Events
# ---------------
# Hook on document methods and events

# doc_events = {
# 	"*": {
# 		"on_update": "method",
# 		"on_cancel": "method",
# 		"on_trash": "method"
# 	}
# }

# Scheduled Tasks
# ---------------

scheduler_events = {
	"cron": {
		"*/5 * * * *": [
			"tata_tele_service.tasks.sync_call_records",
		],
	},
}

# Testing
# -------

# before_tests = "tata_tele_service.install.before_tests"

# Extend DocType Class
# ------------------------------
#
# Specify custom mixins to extend the standard doctype controller.
# extend_doctype_class = {
# 	"Task": "tata_tele_service.custom.task.CustomTaskMixin"
# }

# Overriding Methods
# ------------------------------
#
# override_whitelisted_methods = {
# 	"frappe.desk.doctype.event.event.get_events": "tata_tele_service.event.get_events"
# }
#
# each overriding function accepts a `data` argument;
# generated from the base implementation of the doctype dashboard,
# along with any modifications made in other Frappe apps
# override_doctype_dashboards = {
# 	"Task": "tata_tele_service.task.get_dashboard_data"
# }

# exempt linked doctypes from being automatically cancelled
#
# auto_cancel_exempted_doctypes = ["Auto Repeat"]

# Ignore links to specified DocTypes when deleting documents
# -----------------------------------------------------------

# ignore_links_on_delete = ["Communication", "ToDo"]

# Request Events
# ----------------
# before_request = ["tata_tele_service.utils.before_request"]
# after_request = ["tata_tele_service.utils.after_request"]

# Job Events
# ----------
# before_job = ["tata_tele_service.utils.before_job"]
# after_job = ["tata_tele_service.utils.after_job"]

# User Data Protection
# --------------------

# user_data_fields = [
# 	{
# 		"doctype": "{doctype_1}",
# 		"filter_by": "{filter_by}",
# 		"redact_fields": ["{field_1}", "{field_2}"],
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_2}",
# 		"filter_by": "{filter_by}",
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_3}",
# 		"strict": False,
# 	},
# 	{
# 		"doctype": "{doctype_4}"
# 	}
# ]

# Authentication and authorization
# --------------------------------

# auth_hooks = [
# 	"tata_tele_service.auth.validate"
# ]

# Automatically update python controller files with type annotations for this app.
export_python_type_annotations = True

# Require all whitelisted methods to have type annotations
require_type_annotated_api_methods = True

# default_log_clearing_doctypes = {
# 	"Logging DocType Name": 30  # days to retain logs
# }

# Translation
# ------------
# List of apps whose translatable strings should be excluded from this app's translations.
# ignore_translatable_strings_from = []
