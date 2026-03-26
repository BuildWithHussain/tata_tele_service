function setupList({ list, call, toast }) {
	let _knownCallIds = null; // null = not yet initialized
	let _pollTimer = null;

	function _isIncoming(direction) {
		return (
			direction === 1 ||
			direction === "1" ||
			String(direction).toLowerCase().includes("inbound") ||
			String(direction).toLowerCase().includes("incoming")
		);
	}

	function poll() {
		if (document.getElementById("smartflo-call-widget")) return;

		call(
			"tata_tele_service.tata_tele_service.doctype.tata_tele_settings.tata_tele_settings.get_live_calls",
			{}
		)
			.then((r) => {
				if (!r || !r.agent_number) return;
				let liveCalls = Array.isArray(r.data) ? r.data : [];

				// First poll: snapshot existing call IDs — don't show UI for these
				if (_knownCallIds === null) {
					_knownCallIds = new Set(liveCalls.map((c) => c.call_id).filter(Boolean));
					return;
				}

				for (let c of liveCalls) {
					if (!_isIncoming(c.direction)) continue;
					let cid = c.call_id;
					if (!cid || _knownCallIds.has(cid)) continue;

					_knownCallIds.add(cid);
					let callerNumber = c.customer_number || c.source || "";
					_showCallWidget(callerNumber, c, call);
					break;
				}
			})
			.catch(() => {});
	}

	_pollTimer = setInterval(poll, 5000);
	poll();

	return { actions: [], bulk_actions: [] };
}

function _showCallWidget(destinationNumber, activeCallData, call) {
	let existing = document.getElementById("smartflo-call-widget");
	if (existing) existing.remove();

	let pollTimer = null;
	let callId = activeCallData ? activeCallData.call_id || null : null;
	let state = "connecting";

	if (activeCallData) {
		let apiState = (activeCallData.state || "").toLowerCase();
		if (apiState.includes("answer") || apiState.includes("bridge")) state = "answered";
		else if (apiState.includes("ring") || apiState.includes("dial")) state = "ringing";
		else state = "answered";
	}

	let phoneIconSvg =
		'<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path fill-rule="evenodd" clip-rule="evenodd" d="M2.67754 2.70675C2.53628 2.84008 2.44787 3.03363 2.46988 3.29885C2.47828 3.40004 2.4869 3.50717 2.49497 3.61981C2.63494 4.75003 2.9076 5.83579 3.29638 6.82863L4.1395 6.29907C5.02533 5.74269 5.45257 4.67951 5.19805 3.66489L4.98918 2.83225C4.93526 2.61729 4.74204 2.46656 4.52043 2.46656H3.36772C3.06265 2.46656 2.82575 2.56686 2.67754 2.70675ZM3.69508 7.71962L4.6536 7.11757C5.89375 6.33864 6.49189 4.85019 6.13556 3.42971L5.9267 2.59708C5.76493 1.9522 5.18528 1.5 4.52043 1.5H3.36772C2.85467 1.5 2.368 1.66981 2.01409 2.00386C1.65323 2.34447 1.46097 2.82869 1.50663 3.3788C1.51521 3.48212 1.52381 3.58915 1.53174 3.70087L1.53262 3.71327L1.53414 3.72561C1.70903 5.14795 2.08181 6.51379 2.62992 7.73832C2.8107 8.1422 3.76654 10.0804 5.03876 11.2498C6.27205 12.3833 6.85696 12.7556 8.29758 13.4488L8.31072 13.4551L8.32421 13.4606C9.77742 14.0548 11.0901 14.3742 12.5272 14.4965C13.6361 14.5909 14.4998 13.677 14.4998 12.6231V11.5096C14.4998 10.8539 14.0598 10.2799 13.4267 10.1095L12.6539 9.90153C11.1864 9.50659 9.63455 10.1384 8.86371 11.4495C8.67966 11.7625 8.49178 12.0826 8.3163 12.3822C7.24188 11.8473 6.72935 11.4908 5.69284 10.5382C4.79599 9.71382 4.04577 8.4042 3.69508 7.71962ZM9.21019 12.7685C10.3726 13.198 11.4466 13.4344 12.6092 13.5334C13.096 13.5749 13.5332 13.1706 13.5332 12.6231V11.5096C13.5332 11.291 13.3866 11.0997 13.1755 11.0429L12.4027 10.8349C11.3541 10.5527 10.2467 11.0044 9.69692 11.9394C9.53381 12.2168 9.3678 12.4995 9.21019 12.7685Z"/></svg>';

	if (!document.getElementById("smartflo-call-styles")) {
		let styleEl = document.createElement("style");
		styleEl.id = "smartflo-call-styles";
		styleEl.textContent = `
      @keyframes cw-enter { from { opacity: 0; transform: translateY(8px) scale(0.97); } }
      @keyframes cw-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
      @keyframes cw-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
      .cw-enter { animation: cw-enter 0.35s cubic-bezier(0.16, 1, 0.3, 1) both; }
      .cw-pulse { animation: cw-pulse 2s ease-in-out infinite; }
      .cw-blink { animation: cw-blink 1s ease-in-out 6; }
      .cw-hangup-icon { transform: rotate(135deg); }
    `;
		document.head.appendChild(styleEl);
	}

	let isMinimized = false;
	let statusText = state === "answered" ? "Incoming - In progress" : "Incoming Call...";
	let statusColor = "rgb(227,138,0)";
	let initialDuration = activeCallData && activeCallData.call_time
		? (() => { let p = activeCallData.call_time.split(":"); return p.length === 3 && p[0] === "00" ? p[1] + ":" + p[2] : activeCallData.call_time; })()
		: "--:--";

	let widget = document.createElement("div");
	widget.id = "smartflo-call-widget";
	widget.style.cssText = "position:fixed;bottom:24px;right:24px;z-index:20;transition:opacity 0.3s;";

	let expanded = document.createElement("div");
	expanded.id = "smartflo-expanded";
	expanded.className = "cw-enter flex flex-col gap-2 rounded-lg bg-surface-gray-7 p-4 pt-2.5 text-ink-gray-2 shadow-2xl";
	expanded.style.width = "280px";
	expanded.innerHTML = `
    <div class="flex items-center justify-between gap-1 text-base cursor-move select-none">
      <div class="flex items-center gap-2 flex-1 min-w-0">
        <div class="size-8 rounded-full bg-surface-gray-6 shrink-0" style="display:flex;align-items:center;justify-content:center;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        </div>
        <div class="flex-1 min-w-0">
          <div id="smartflo-header-name" class="text-sm font-medium text-ink-white truncate">${destinationNumber}</div>
          <div class="flex items-center gap-1 text-xs">
            <div id="smartflo-dot" class="cw-pulse shrink-0" style="width:6px;height:6px;border-radius:50%;background:${statusColor}"></div>
            <span id="smartflo-call-status" style="color:${statusColor}">${statusText}</span>
          </div>
        </div>
      </div>
      <button id="smartflo-minimize-btn" class="size-7 rounded-md flex items-center justify-center text-ink-white hover:bg-surface-gray-6 shrink-0" style="border:none;background:transparent;cursor:pointer;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 12h14"/></svg>
      </button>
    </div>
    <div class="flex flex-col items-center py-4 gap-1">
      <div class="size-12 rounded-full bg-surface-gray-6" style="display:flex;align-items:center;justify-content:center;">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
      </div>
      <div id="smartflo-customer-name" class="text-sm font-medium text-ink-white" style="display:none;"></div>
      <div class="text-sm text-ink-gray-4">${destinationNumber}</div>
    </div>
    <div id="smartflo-call-duration" class="text-center text-sm text-ink-gray-4 pb-3" style="font-variant-numeric:tabular-nums;">${initialDuration}</div>
    <div class="flex justify-center pb-1">
      <button id="smartflo-hangup-btn" class="size-10 rounded-full bg-surface-red-5 hover:bg-surface-red-6 text-ink-white" style="border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;">
        <span class="cw-hangup-icon" style="display:flex">${phoneIconSvg}</span>
      </button>
    </div>
  `;

	let pill = document.createElement("div");
	pill.id = "smartflo-pill";
	pill.className = "cw-enter flex cursor-pointer select-none items-center gap-1 rounded-full bg-surface-gray-7 px-2 text-base text-ink-gray-2";
	pill.style.cssText = "padding-top:7px;padding-bottom:7px;display:none;";
	pill.innerHTML = `
    <div class="size-5 rounded-full bg-surface-gray-6 shrink-0" style="display:flex;align-items:center;justify-content:center;">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
    </div>
    <span id="smartflo-pill-number" class="text-xs text-ink-white" style="white-space:nowrap;max-width:120px;overflow:hidden;text-overflow:ellipsis;">${destinationNumber}</span>
    <span class="text-xs text-ink-gray-4">&middot;</span>
    <span id="smartflo-pill-duration" class="text-xs text-ink-gray-4" style="font-variant-numeric:tabular-nums;">${initialDuration}</span>
    <button id="smartflo-pill-hangup" class="size-6 rounded-full bg-surface-red-5 hover:bg-surface-red-6 text-ink-white shrink-0" style="border:none;cursor:pointer;margin-left:2px;display:flex;align-items:center;justify-content:center;">
      <span class="cw-hangup-icon" style="display:flex"><svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor"><path fill-rule="evenodd" clip-rule="evenodd" d="M2.67754 2.70675C2.53628 2.84008 2.44787 3.03363 2.46988 3.29885C2.47828 3.40004 2.4869 3.50717 2.49497 3.61981C2.63494 4.75003 2.9076 5.83579 3.29638 6.82863L4.1395 6.29907C5.02533 5.74269 5.45257 4.67951 5.19805 3.66489L4.98918 2.83225C4.93526 2.61729 4.74204 2.46656 4.52043 2.46656H3.36772C3.06265 2.46656 2.82575 2.56686 2.67754 2.70675ZM3.69508 7.71962L4.6536 7.11757C5.89375 6.33864 6.49189 4.85019 6.13556 3.42971L5.9267 2.59708C5.76493 1.9522 5.18528 1.5 4.52043 1.5H3.36772C2.85467 1.5 2.368 1.66981 2.01409 2.00386C1.65323 2.34447 1.46097 2.82869 1.50663 3.3788C1.51521 3.48212 1.52381 3.58915 1.53174 3.70087L1.53262 3.71327L1.53414 3.72561C1.70903 5.14795 2.08181 6.51379 2.62992 7.73832C2.8107 8.1422 3.76654 10.0804 5.03876 11.2498C6.27205 12.3833 6.85696 12.7556 8.29758 13.4488L8.31072 13.4551L8.32421 13.4606C9.77742 14.0548 11.0901 14.3742 12.5272 14.4965C13.6361 14.5909 14.4998 13.677 14.4998 12.6231V11.5096C14.4998 10.8539 14.0598 10.2799 13.4267 10.1095L12.6539 9.90153C11.1864 9.50659 9.63455 10.1384 8.86371 11.4495C8.67966 11.7625 8.49178 12.0826 8.3163 12.3822C7.24188 11.8473 6.72935 11.4908 5.69284 10.5382C4.79599 9.71382 4.04577 8.4042 3.69508 7.71962ZM9.21019 12.7685C10.3726 13.198 11.4466 13.4344 12.6092 13.5334C13.096 13.5749 13.5332 13.1706 13.5332 12.6231V11.5096C13.5332 11.291 13.3866 11.0997 13.1755 11.0429L12.4027 10.8349C11.3541 10.5527 10.2467 11.0044 9.69692 11.9394C9.53381 12.2168 9.3678 12.4995 9.21019 12.7685Z"/></svg></span>
    </button>
  `;

	widget.appendChild(expanded);
	widget.appendChild(pill);
	document.body.appendChild(widget);

	// Fetch customer info
	if (destinationNumber) {
		call(
			"tata_tele_service.tata_tele_service.doctype.tata_tele_settings.tata_tele_settings.get_customer_by_phone",
			{ phone_number: destinationNumber }
		).then((r) => {
			if (r && r.customer_name) {
				let nameEl = document.getElementById("smartflo-customer-name");
				if (nameEl) { nameEl.textContent = r.customer_name; nameEl.style.display = "block"; }
				let headerEl = document.getElementById("smartflo-header-name");
				if (headerEl) headerEl.textContent = r.customer_name;
				let pillEl = document.getElementById("smartflo-pill-number");
				if (pillEl) pillEl.textContent = r.customer_name;
			}
		}).catch(() => {});
	}

	// Minimize / Expand
	function toggleMinimize() {
		isMinimized = !isMinimized;
		expanded.style.display = isMinimized ? "none" : "";
		pill.style.display = isMinimized ? "flex" : "none";
	}
	document.getElementById("smartflo-minimize-btn").addEventListener("click", toggleMinimize);
	pill.addEventListener("click", (e) => {
		if (e.target.closest("#smartflo-pill-hangup")) return;
		toggleMinimize();
	});

	// Drag
	let dragHeader = expanded.querySelector(".cursor-move");
	let isDragging = false, dragStartX = 0, dragStartY = 0, widgetStartX = 0, widgetStartY = 0;
	dragHeader.addEventListener("mousedown", (e) => {
		if (e.target.closest("#smartflo-minimize-btn")) return;
		isDragging = true;
		dragStartX = e.clientX; dragStartY = e.clientY;
		let rect = widget.getBoundingClientRect();
		widgetStartX = rect.left; widgetStartY = rect.top;
		widget.style.bottom = "auto"; widget.style.right = "auto";
		widget.style.left = widgetStartX + "px"; widget.style.top = widgetStartY + "px";
		e.preventDefault();
	});
	document.addEventListener("mousemove", (e) => {
		if (!isDragging) return;
		widget.style.left = widgetStartX + (e.clientX - dragStartX) + "px";
		widget.style.top = widgetStartY + (e.clientY - dragStartY) + "px";
	});
	document.addEventListener("mouseup", () => { isDragging = false; });

	// Duration timer
	let lastKnownSeconds = 0, lastSyncedAt = 0, tickTimer = null;
	function parseCallTime(t) {
		let p = (t || "").split(":").map(Number);
		if (p.length === 3) return p[0] * 3600 + p[1] * 60 + p[2];
		if (p.length === 2) return p[0] * 60 + p[1];
		return 0;
	}
	function formatDuration(s) {
		let h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
		let mm = String(m).padStart(2, "0"), ss = String(sec).padStart(2, "0");
		return h > 0 ? h + ":" + mm + ":" + ss : mm + ":" + ss;
	}
	function syncFromApi(t) {
		lastKnownSeconds = parseCallTime(t);
		lastSyncedAt = Date.now();
		if (!tickTimer) tickTimer = setInterval(() => {
			let elapsed = Math.floor((Date.now() - lastSyncedAt) / 1000);
			let text = formatDuration(lastKnownSeconds + elapsed);
			let el = document.getElementById("smartflo-call-duration");
			if (el) el.textContent = text;
			let p = document.getElementById("smartflo-pill-duration");
			if (p) p.textContent = text;
		}, 1000);
	}

	if (activeCallData && activeCallData.call_time && state === "answered") {
		syncFromApi(activeCallData.call_time);
	}

	function findOurCall(liveCalls) {
		for (let c of liveCalls) {
			if (callId && c.call_id === callId) return c;
		}
		for (let c of liveCalls) {
			let d = (c.customer_number || c.destination || "").replace(/\D/g, "").slice(-10);
			let o = destinationNumber.replace(/\D/g, "").slice(-10);
			if (d && o && d === o) { if (!callId) callId = c.call_id; return c; }
		}
		return null;
	}

	function pollCallStatus() {
		call(
			"tata_tele_service.tata_tele_service.doctype.tata_tele_settings.tata_tele_settings.get_live_calls",
			{}
		).then((r) => {
			let statusEl = document.getElementById("smartflo-call-status");
			if (!statusEl) { stopPolling(); return; }
			let liveCalls = [];
			if (r && r.data) {
				if (Array.isArray(r.data)) liveCalls = r.data;
				else if (Array.isArray(r.data.data)) liveCalls = r.data.data;
			}
			let ourCall = findOurCall(liveCalls);
			if (ourCall) {
				let apiState = (ourCall.state || "").toLowerCase();
				let dotEl = document.getElementById("smartflo-dot");
				let color = "rgb(227,138,0)";
				if (apiState.includes("answer") || apiState.includes("bridge")) {
					state = "answered";
					statusEl.textContent = "Incoming - In progress";
					statusEl.style.color = color;
					if (dotEl) dotEl.style.background = color;
					if (ourCall.call_time) syncFromApi(ourCall.call_time);
				} else if (apiState.includes("ring") || apiState.includes("dial")) {
					state = "ringing";
					statusEl.textContent = "Incoming Call...";
					statusEl.style.color = color;
					if (dotEl) dotEl.style.background = color;
				}
			} else if (state === "answered" || state === "ringing") {
				endCall("Call Ended");
			}
		}).catch(() => {});
	}

	pollTimer = setInterval(pollCallStatus, 4000);
	setTimeout(pollCallStatus, 2000);

	function doHangup(btn) {
		if (btn) { btn.disabled = true; btn.style.opacity = "0.5"; }
		if (callId) {
			call(
				"tata_tele_service.tata_tele_service.doctype.tata_tele_settings.tata_tele_settings.hangup_call",
				{ call_id: callId }
			).then(() => endCall("Call ended")).catch(() => endCall("Call ended"));
		} else {
			endCall("Call ended");
		}
	}
	document.getElementById("smartflo-hangup-btn").addEventListener("click", (e) => doHangup(e.currentTarget));
	document.getElementById("smartflo-pill-hangup").addEventListener("click", (e) => { e.stopPropagation(); doHangup(e.currentTarget); });

	function endCall(message) {
		stopPolling();
		let red = "var(--text-ink-red-3,rgb(181,42,42))";
		let s = document.getElementById("smartflo-call-status");
		if (s) { s.textContent = message; s.style.color = red; s.classList.add("cw-blink"); }
		let d = document.getElementById("smartflo-dot");
		if (d) { d.style.background = red; d.className = ""; }
		let h = document.getElementById("smartflo-hangup-btn");
		if (h) h.style.display = "none";
		let ph = document.getElementById("smartflo-pill-hangup");
		if (ph) ph.style.display = "none";
		let pd = document.getElementById("smartflo-pill-duration");
		if (pd) { pd.textContent = message; pd.style.color = red; }
		setTimeout(() => {
			let w = document.getElementById("smartflo-call-widget");
			if (w) { w.style.opacity = "0"; setTimeout(() => w.remove(), 300); }
		}, 3000);
	}

	function stopPolling() {
		if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
		if (tickTimer) { clearInterval(tickTimer); tickTimer = null; }
	}
}
