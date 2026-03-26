// Incoming Call Notification Widget for CRM Portal
// Polls get_live_calls every 5 seconds, detects inbound calls,
// looks up the Customer, and shows a floating call widget.

(function () {
	const TTS_METHOD =
		"tata_tele_service.tata_tele_service.doctype.tata_tele_settings.tata_tele_settings";

	let _pollTimer = null;
	let _knownCallIds = new Set();

	function apiCall(method, args) {
		let params = new URLSearchParams();
		for (let key in args) {
			params.append(key, args[key]);
		}
		let url = "/api/method/" + method;
		if (params.toString()) url += "?" + params.toString();
		return fetch(url, {
			method: "GET",
			headers: {
				"X-Frappe-CSRF-Token": window.csrf_token,
				Accept: "application/json",
			},
		})
			.then((r) => r.json())
			.then((d) => d.message);
	}

	function isIncomingDirection(direction) {
		return (
			direction === 1 ||
			direction === "1" ||
			String(direction).toLowerCase().includes("inbound") ||
			String(direction).toLowerCase().includes("incoming")
		);
	}

	function startIncomingCallPolling() {
		if (_pollTimer) return;

		function poll() {
			if (document.getElementById("smartflo-incoming-widget")) return;

			apiCall(`${TTS_METHOD}.get_live_calls`, {})
				.then((r) => {
					if (!r || !r.agent_number) return;
					let liveCalls = Array.isArray(r.data) ? r.data : [];

					for (let c of liveCalls) {
						if (!isIncomingDirection(c.direction)) continue;

						let cid = c.call_id;
						if (cid && _knownCallIds.has(cid)) continue;
						if (cid) _knownCallIds.add(cid);

						let callerNumber =
							c.customer_number || c.source || c.destination || "";
						showIncomingCallWidget(callerNumber, c);
						break;
					}
				})
				.catch(() => {});
		}

		_pollTimer = setInterval(poll, 5000);
		setTimeout(poll, 2000);
	}

	function showIncomingCallWidget(callerNumber, callData) {
		let existing = document.getElementById("smartflo-incoming-widget");
		if (existing) existing.remove();

		let pollTimer = null;
		let tickTimer = null;
		let callId = callData.call_id || null;
		let state = "ringing";

		let apiState = (callData.state || "").toLowerCase();
		if (apiState.includes("answer") || apiState.includes("bridge")) {
			state = "answered";
		}

		let statusText =
			state === "answered" ? "Incoming - In progress" : "Incoming Call...";
		let orangeColor = "#e38a00";
		let initialDuration =
			callData.call_time
				? (() => {
						let p = callData.call_time.split(":");
						return p.length === 3 && p[0] === "00"
							? p[1] + ":" + p[2]
							: callData.call_time;
				  })()
				: "--:--";

		// Inject styles once
		if (!document.getElementById("smartflo-incoming-styles")) {
			let styleEl = document.createElement("style");
			styleEl.id = "smartflo-incoming-styles";
			styleEl.textContent = `
				@keyframes ic-enter { from { opacity: 0; transform: translateY(8px) scale(0.97); } }
				@keyframes ic-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
				@keyframes ic-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
				.ic-enter { animation: ic-enter 0.35s cubic-bezier(0.16, 1, 0.3, 1) both; }
				.ic-pulse { animation: ic-pulse 2s ease-in-out infinite; }
				.ic-blink { animation: ic-blink 1s ease-in-out 6; }
				.ic-hangup-icon { transform: rotate(135deg); display: flex; }
				#smartflo-incoming-widget * { box-sizing: border-box; }
			`;
			document.head.appendChild(styleEl);
		}

		let phoneIconSvg =
			'<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path fill-rule="evenodd" clip-rule="evenodd" d="M2.67754 2.70675C2.53628 2.84008 2.44787 3.03363 2.46988 3.29885C2.47828 3.40004 2.4869 3.50717 2.49497 3.61981C2.63494 4.75003 2.9076 5.83579 3.29638 6.82863L4.1395 6.29907C5.02533 5.74269 5.45257 4.67951 5.19805 3.66489L4.98918 2.83225C4.93526 2.61729 4.74204 2.46656 4.52043 2.46656H3.36772C3.06265 2.46656 2.82575 2.56686 2.67754 2.70675ZM3.69508 7.71962L4.6536 7.11757C5.89375 6.33864 6.49189 4.85019 6.13556 3.42971L5.9267 2.59708C5.76493 1.9522 5.18528 1.5 4.52043 1.5H3.36772C2.85467 1.5 2.368 1.66981 2.01409 2.00386C1.65323 2.34447 1.46097 2.82869 1.50663 3.3788C1.51521 3.48212 1.52381 3.58915 1.53174 3.70087L1.53262 3.71327L1.53414 3.72561C1.70903 5.14795 2.08181 6.51379 2.62992 7.73832C2.8107 8.1422 3.76654 10.0804 5.03876 11.2498C6.27205 12.3833 6.85696 12.7556 8.29758 13.4488L8.31072 13.4551L8.32421 13.4606C9.77742 14.0548 11.0901 14.3742 12.5272 14.4965C13.6361 14.5909 14.4998 13.677 14.4998 12.6231V11.5096C14.4998 10.8539 14.0598 10.2799 13.4267 10.1095L12.6539 9.90153C11.1864 9.50659 9.63455 10.1384 8.86371 11.4495C8.67966 11.7625 8.49178 12.0826 8.3163 12.3822C7.24188 11.8473 6.72935 11.4908 5.69284 10.5382C4.79599 9.71382 4.04577 8.4042 3.69508 7.71962ZM9.21019 12.7685C10.3726 13.198 11.4466 13.4344 12.6092 13.5334C13.096 13.5749 13.5332 13.1706 13.5332 12.6231V11.5096C13.5332 11.291 13.3866 11.0997 13.1755 11.0429L12.4027 10.8349C11.3541 10.5527 10.2467 11.0044 9.69692 11.9394C9.53381 12.2168 9.3678 12.4995 9.21019 12.7685Z"/></svg>';

		let widget = document.createElement("div");
		widget.id = "smartflo-incoming-widget";
		widget.style.cssText =
			"position:fixed;bottom:24px;right:24px;z-index:1050;transition:opacity 0.3s;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;";

		let expanded = document.createElement("div");
		expanded.id = "ic-expanded";
		expanded.className = "ic-enter";
		expanded.style.cssText =
			"display:flex;flex-direction:column;gap:8px;border-radius:8px;background:#1f2937;padding:16px;padding-top:10px;color:#d1d5db;box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);width:280px;";
		expanded.innerHTML = `
			<div style="display:flex;align-items:center;justify-content:space-between;gap:4px;cursor:move;user-select:none;">
				<div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0;">
					<div style="width:32px;height:32px;border-radius:50%;background:#374151;display:flex;align-items:center;justify-content:center;color:#9ca3af;flex-shrink:0;">
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
					</div>
					<div style="flex:1;min-width:0;">
						<div id="ic-header-name" style="font-size:13px;font-weight:500;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${callerNumber}</div>
						<div style="display:flex;align-items:center;gap:4px;font-size:11px;">
							<div id="ic-dot" class="ic-pulse" style="width:6px;height:6px;border-radius:50%;background:${orangeColor};flex-shrink:0;"></div>
							<span id="ic-status" style="color:${orangeColor};">${statusText}</span>
						</div>
					</div>
				</div>
				<button id="ic-minimize-btn" style="width:28px;height:28px;border-radius:6px;display:flex;align-items:center;justify-content:center;color:#fff;border:none;background:transparent;cursor:pointer;flex-shrink:0;">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 12h14"/></svg>
				</button>
			</div>
			<div style="display:flex;flex-direction:column;align-items:center;padding:16px 0;gap:4px;">
				<div style="width:48px;height:48px;border-radius:50%;background:#374151;display:flex;align-items:center;justify-content:center;color:#9ca3af;">
					<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
				</div>
				<div id="ic-customer-name" style="font-size:13px;font-weight:500;color:#fff;display:none;"></div>
				<div style="font-size:13px;color:#9ca3af;">${callerNumber}</div>
			</div>
			<div id="ic-duration" style="text-align:center;font-size:13px;color:#9ca3af;padding-bottom:12px;font-variant-numeric:tabular-nums;">${initialDuration}</div>
			<div style="display:flex;justify-content:center;padding-bottom:4px;">
				<button id="ic-hangup-btn" style="width:40px;height:40px;border-radius:50%;background:#dc2626;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#fff;">
					<span class="ic-hangup-icon">${phoneIconSvg}</span>
				</button>
			</div>
		`;

		let pill = document.createElement("div");
		pill.id = "ic-pill";
		pill.className = "ic-enter";
		pill.style.cssText =
			"display:none;cursor:pointer;user-select:none;align-items:center;justify-content:space-between;gap:4px;border-radius:9999px;background:#1f2937;padding:7px 8px;color:#d1d5db;";
		pill.innerHTML = `
			<div style="width:20px;height:20px;border-radius:50%;background:#374151;display:flex;align-items:center;justify-content:center;color:#9ca3af;flex-shrink:0;">
				<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
			</div>
			<span id="ic-pill-number" style="font-size:11px;color:#fff;white-space:nowrap;max-width:120px;overflow:hidden;text-overflow:ellipsis;">${callerNumber}</span>
			<span style="font-size:11px;color:#9ca3af;">&middot;</span>
			<span id="ic-pill-duration" style="font-size:11px;color:#9ca3af;font-variant-numeric:tabular-nums;">${initialDuration}</span>
			<button id="ic-pill-hangup" style="width:24px;height:24px;border-radius:50%;background:#dc2626;border:none;cursor:pointer;margin-left:2px;display:flex;align-items:center;justify-content:center;color:#fff;flex-shrink:0;">
				<span class="ic-hangup-icon"><svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor"><path fill-rule="evenodd" clip-rule="evenodd" d="M2.67754 2.70675C2.53628 2.84008 2.44787 3.03363 2.46988 3.29885C2.47828 3.40004 2.4869 3.50717 2.49497 3.61981C2.63494 4.75003 2.9076 5.83579 3.29638 6.82863L4.1395 6.29907C5.02533 5.74269 5.45257 4.67951 5.19805 3.66489L4.98918 2.83225C4.93526 2.61729 4.74204 2.46656 4.52043 2.46656H3.36772C3.06265 2.46656 2.82575 2.56686 2.67754 2.70675ZM3.69508 7.71962L4.6536 7.11757C5.89375 6.33864 6.49189 4.85019 6.13556 3.42971L5.9267 2.59708C5.76493 1.9522 5.18528 1.5 4.52043 1.5H3.36772C2.85467 1.5 2.368 1.66981 2.01409 2.00386C1.65323 2.34447 1.46097 2.82869 1.50663 3.3788C1.51521 3.48212 1.52381 3.58915 1.53174 3.70087L1.53262 3.71327L1.53414 3.72561C1.70903 5.14795 2.08181 6.51379 2.62992 7.73832C2.8107 8.1422 3.76654 10.0804 5.03876 11.2498C6.27205 12.3833 6.85696 12.7556 8.29758 13.4488L8.31072 13.4551L8.32421 13.4606C9.77742 14.0548 11.0901 14.3742 12.5272 14.4965C13.6361 14.5909 14.4998 13.677 14.4998 12.6231V11.5096C14.4998 10.8539 14.0598 10.2799 13.4267 10.1095L12.6539 9.90153C11.1864 9.50659 9.63455 10.1384 8.86371 11.4495C8.67966 11.7625 8.49178 12.0826 8.3163 12.3822C7.24188 11.8473 6.72935 11.4908 5.69284 10.5382C4.79599 9.71382 4.04577 8.4042 3.69508 7.71962ZM9.21019 12.7685C10.3726 13.198 11.4466 13.4344 12.6092 13.5334C13.096 13.5749 13.5332 13.1706 13.5332 12.6231V11.5096C13.5332 11.291 13.3866 11.0997 13.1755 11.0429L12.4027 10.8349C11.3541 10.5527 10.2467 11.0044 9.69692 11.9394C9.53381 12.2168 9.3678 12.4995 9.21019 12.7685Z"/></svg></span>
			</button>
		`;

		widget.appendChild(expanded);
		widget.appendChild(pill);
		document.body.appendChild(widget);

		// Fetch customer info
		if (callerNumber) {
			apiCall(`${TTS_METHOD}.get_customer_by_phone`, {
				phone_number: callerNumber,
			})
				.then((r) => {
					if (r && r.customer_name) {
						let nameEl = document.getElementById("ic-customer-name");
						if (nameEl) {
							nameEl.textContent = r.customer_name;
							nameEl.style.display = "block";
						}
						let headerEl = document.getElementById("ic-header-name");
						if (headerEl) headerEl.textContent = r.customer_name;
						let pillNum = document.getElementById("ic-pill-number");
						if (pillNum) pillNum.textContent = r.customer_name;
					}
				})
				.catch(() => {});
		}

		// Minimize / Expand
		let isMinimized = false;
		function toggleMinimize() {
			isMinimized = !isMinimized;
			expanded.style.display = isMinimized ? "none" : "";
			pill.style.display = isMinimized ? "flex" : "none";
		}

		document
			.getElementById("ic-minimize-btn")
			.addEventListener("click", toggleMinimize);
		pill.addEventListener("click", (e) => {
			if (e.target.closest("#ic-pill-hangup")) return;
			toggleMinimize();
		});

		// Drag
		let dragHeader = expanded.querySelector("[style*='cursor:move']");
		let isDragging = false;
		let dragStartX = 0,
			dragStartY = 0,
			widgetStartX = 0,
			widgetStartY = 0;

		dragHeader.addEventListener("mousedown", (e) => {
			if (e.target.closest("#ic-minimize-btn")) return;
			isDragging = true;
			dragStartX = e.clientX;
			dragStartY = e.clientY;
			let rect = widget.getBoundingClientRect();
			widgetStartX = rect.left;
			widgetStartY = rect.top;
			widget.style.bottom = "auto";
			widget.style.right = "auto";
			widget.style.left = widgetStartX + "px";
			widget.style.top = widgetStartY + "px";
			e.preventDefault();
		});
		document.addEventListener("mousemove", (e) => {
			if (!isDragging) return;
			widget.style.left = widgetStartX + (e.clientX - dragStartX) + "px";
			widget.style.top = widgetStartY + (e.clientY - dragStartY) + "px";
		});
		document.addEventListener("mouseup", () => {
			isDragging = false;
		});

		// Duration timer
		let lastKnownSeconds = 0;
		let lastSyncedAt = 0;

		function parseCallTime(ct) {
			let parts = (ct || "").split(":").map(Number);
			if (parts.length === 3)
				return parts[0] * 3600 + parts[1] * 60 + parts[2];
			if (parts.length === 2) return parts[0] * 60 + parts[1];
			return 0;
		}

		function formatDuration(s) {
			let hrs = Math.floor(s / 3600);
			let mins = Math.floor((s % 3600) / 60);
			let secs = s % 60;
			let mm = String(mins).padStart(2, "0");
			let ss = String(secs).padStart(2, "0");
			return hrs > 0 ? hrs + ":" + mm + ":" + ss : mm + ":" + ss;
		}

		function syncFromApi(ct) {
			lastKnownSeconds = parseCallTime(ct);
			lastSyncedAt = Date.now();
			if (!tickTimer) tickTimer = setInterval(tickDuration, 1000);
		}

		function tickDuration() {
			let elapsed = Math.floor((Date.now() - lastSyncedAt) / 1000);
			let text = formatDuration(lastKnownSeconds + elapsed);
			let el = document.getElementById("ic-duration");
			if (el) el.textContent = text;
			let pillDur = document.getElementById("ic-pill-duration");
			if (pillDur) pillDur.textContent = text;
		}

		if (callData.call_time && state === "answered") {
			syncFromApi(callData.call_time);
		}

		// Find our call
		function findOurCall(liveCalls) {
			for (let c of liveCalls) {
				if (callId && c.call_id === callId) return c;
			}
			for (let c of liveCalls) {
				let num = c.customer_number || c.source || c.destination || "";
				let numDigits = num.replace(/\D/g, "").slice(-10);
				let ourDigits = callerNumber.replace(/\D/g, "").slice(-10);
				if (numDigits && ourDigits && numDigits === ourDigits) {
					if (!callId) callId = c.call_id;
					return c;
				}
			}
			return null;
		}

		// Poll status
		function pollCallStatus() {
			apiCall(`${TTS_METHOD}.get_live_calls`, {})
				.then((r) => {
					let statusEl = document.getElementById("ic-status");
					if (!statusEl) {
						stopPolling();
						return;
					}
					let liveCalls =
						r && Array.isArray(r.data) ? r.data : [];
					let ourCall = findOurCall(liveCalls);

					if (ourCall) {
						let s = (ourCall.state || "").toLowerCase();
						let dotEl = document.getElementById("ic-dot");
						if (
							s.includes("answer") ||
							s.includes("bridge")
						) {
							state = "answered";
							statusEl.textContent = "Incoming - In progress";
							statusEl.style.color = orangeColor;
							if (dotEl) dotEl.style.background = orangeColor;
							if (ourCall.call_time) syncFromApi(ourCall.call_time);
						} else if (
							s.includes("ring") ||
							s.includes("dial")
						) {
							state = "ringing";
							statusEl.textContent = "Incoming Call...";
							statusEl.style.color = orangeColor;
							if (dotEl) dotEl.style.background = orangeColor;
						} else {
							statusEl.textContent = ourCall.state || "Active";
							statusEl.style.color = "#9ca3af";
						}
					} else if (
						state === "answered" ||
						state === "ringing"
					) {
						endCall("Call Ended");
					}
				})
				.catch(() => {});
		}

		pollTimer = setInterval(pollCallStatus, 4000);
		setTimeout(pollCallStatus, 2000);

		// Hangup
		function doHangup(btn) {
			if (btn) {
				btn.disabled = true;
				btn.style.opacity = "0.5";
				btn.style.cursor = "not-allowed";
			}
			if (callId) {
				apiCall(`${TTS_METHOD}.hangup_call`, { call_id: callId })
					.then(() => endCall("Call ended"))
					.catch(() => endCall("Call ended"));
			} else {
				endCall("Call ended");
			}
		}

		document
			.getElementById("ic-hangup-btn")
			.addEventListener("click", (e) => doHangup(e.currentTarget));
		document
			.getElementById("ic-pill-hangup")
			.addEventListener("click", (e) => {
				e.stopPropagation();
				doHangup(e.currentTarget);
			});

		function endCall(message) {
			stopPolling();
			let redColor = "#b52a2a";
			let statusEl = document.getElementById("ic-status");
			if (statusEl) {
				statusEl.textContent = message;
				statusEl.style.color = redColor;
				statusEl.classList.add("ic-blink");
			}
			let dotEl = document.getElementById("ic-dot");
			if (dotEl) {
				dotEl.style.background = redColor;
				dotEl.className = "";
			}
			let hangup = document.getElementById("ic-hangup-btn");
			if (hangup) hangup.style.display = "none";
			let pillHangup = document.getElementById("ic-pill-hangup");
			if (pillHangup) pillHangup.style.display = "none";
			let pillDur = document.getElementById("ic-pill-duration");
			if (pillDur) {
				pillDur.textContent = message;
				pillDur.style.color = redColor;
			}
			setTimeout(() => {
				let w = document.getElementById("smartflo-incoming-widget");
				if (w) {
					w.style.opacity = "0";
					setTimeout(() => w.remove(), 300);
				}
			}, 3000);
		}

		function stopPolling() {
			if (pollTimer) {
				clearInterval(pollTimer);
				pollTimer = null;
			}
			if (tickTimer) {
				clearInterval(tickTimer);
				tickTimer = null;
			}
		}
	}

	// Start polling when page is ready
	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", startIncomingCallPolling);
	} else {
		startIncomingCallPolling();
	}
})();
