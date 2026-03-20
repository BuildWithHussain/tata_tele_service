class CRMLead {
  onLoad() {
    let doc = this.doc;

    // Check for any active calls on page load — resume widget if agent is on a call
    checkForActiveCalls();

    this.actions = [
      {
        label: "Make a call",
        onClick: () => {
          let defaultNumber = doc.mobile_no || doc.phone || "";
          createDialog({
            title: "Make a call",
            html: '<div style="margin-top:8px"><label class="text-sm text-ink-gray-5" style="display:block;margin-bottom:4px">Destination Number</label><input id="smartflo-dest" type="text" value="' + defaultNumber + '" class="form-input" style="width:100%;padding:8px;border:1px solid var(--gray-300);border-radius:8px;font-size:14px" /></div>',
            actions: [
              {
                label: "Call",
                variant: "solid",
                onClick: (close) => {
                  let num = document.getElementById("smartflo-dest").value;
                  if (!num) {
                    toast.error("Please enter a destination number");
                    return;
                  }
                  call(
                    "tata_tele_service.tata_tele_service.doctype.tata_tele_settings.tata_tele_settings.click_to_call",
                    { destination_number: num },
                  ).then((r) => {
                    close();
                    showCallWidget(num, r);
                  });
                },
              },
            ],
          });
        },
      },
      {
        label: "Create Task",
        onClick: () => {
          let selectedProduct = "";
          createDialog({
            title: "Create Aionion Task",
            html: '<div style="margin-top:8px"><label class="text-sm text-ink-gray-5" style="display:block;margin-bottom:4px">Product</label><select id="aionion-product-select" class="form-input" style="width:100%;padding:8px 10px;height:38px;border:1px solid var(--gray-300);border-radius:8px;font-size:14px;background:white"><option value="">Loading...</option></select></div>',
            actions: [
              {
                label: "Create",
                variant: "solid",
                onClick: (close) => {
                  if (!selectedProduct) {
                    toast.error("Please select a product");
                    return;
                  }
                  call("create_aionion_task", {
                    lead: doc.name,
                    aionion_product: selectedProduct,
                  }).then((taskName) => {
                    close();
                    window.location.href = "/app/aionion-task/" + taskName;
                  });
                },
              },
            ],
          });
          call("frappe.desk.search.search_link", {
            doctype: "Aionion Product",
            txt: "",
          }).then((results) => {
            let select = document.getElementById("aionion-product-select");
            select.innerHTML = '<option value="">Select a product...</option>' +
              (results || []).map((r) => '<option value="' + r.value + '">' + r.value + '</option>').join("");
            select.addEventListener("change", () => {
              selectedProduct = select.value;
            });
          });
        },
      },
    ];
  }
}

// ── Check for active calls on page load ──────────────────────────
function checkForActiveCalls() {
  // Don't check if widget is already showing
  if (document.getElementById("smartflo-call-widget")) return;

  call(
    "tata_tele_service.tata_tele_service.doctype.tata_tele_settings.tata_tele_settings.get_live_calls",
    {},
  ).then((r) => {
    if (!r || !r.agent_number) return; // No mobile configured — skip
    let liveCalls = Array.isArray(r.data) ? r.data : [];
    if (liveCalls.length === 0) return;

    // Show widget for the first active call (agent is already filtered server-side)
    let activeCall = liveCalls[0];
    let destNumber = activeCall.customer_number || activeCall.destination || "";
    showCallWidget(destNumber, null, activeCall);
  }).catch(() => {
    // Silently ignore — agent may not have mobile configured
  });
}

// ── Live Call Widget ──────────────────────────────────────────────
// activeCallData: if provided, we're resuming an existing call (from page load check)
function showCallWidget(destinationNumber, clickToCallResponse, activeCallData) {
  // Remove any existing widget
  let existing = document.getElementById("smartflo-call-widget");
  if (existing) existing.remove();

  let pollTimer = null;
  let callId = null;
  let state = "connecting"; // connecting → ringing → answered → ended

  // If resuming an existing call, seed call_id and state from it
  if (activeCallData) {
    callId = activeCallData.call_id || null;
    let apiState = (activeCallData.state || "").toLowerCase();
    if (apiState.includes("answer") || apiState.includes("bridge")) {
      state = "answered";
    } else if (apiState.includes("ring") || apiState.includes("dial")) {
      state = "ringing";
    } else {
      state = "answered"; // Assume active if it's in live_calls
    }
  }

  // Try to extract call_id from click_to_call response
  if (!callId && clickToCallResponse && clickToCallResponse.data) {
    let data = clickToCallResponse.data;
    callId = data.call_id || data.callid || data.id || null;
  }

  // Phone icon SVG (from CRM PhoneIcon.vue)
  let phoneIconSvg = '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path fill-rule="evenodd" clip-rule="evenodd" d="M2.67754 2.70675C2.53628 2.84008 2.44787 3.03363 2.46988 3.29885C2.47828 3.40004 2.4869 3.50717 2.49497 3.61981C2.63494 4.75003 2.9076 5.83579 3.29638 6.82863L4.1395 6.29907C5.02533 5.74269 5.45257 4.67951 5.19805 3.66489L4.98918 2.83225C4.93526 2.61729 4.74204 2.46656 4.52043 2.46656H3.36772C3.06265 2.46656 2.82575 2.56686 2.67754 2.70675ZM3.69508 7.71962L4.6536 7.11757C5.89375 6.33864 6.49189 4.85019 6.13556 3.42971L5.9267 2.59708C5.76493 1.9522 5.18528 1.5 4.52043 1.5H3.36772C2.85467 1.5 2.368 1.66981 2.01409 2.00386C1.65323 2.34447 1.46097 2.82869 1.50663 3.3788C1.51521 3.48212 1.52381 3.58915 1.53174 3.70087L1.53262 3.71327L1.53414 3.72561C1.70903 5.14795 2.08181 6.51379 2.62992 7.73832C2.8107 8.1422 3.76654 10.0804 5.03876 11.2498C6.27205 12.3833 6.85696 12.7556 8.29758 13.4488L8.31072 13.4551L8.32421 13.4606C9.77742 14.0548 11.0901 14.3742 12.5272 14.4965C13.6361 14.5909 14.4998 13.677 14.4998 12.6231V11.5096C14.4998 10.8539 14.0598 10.2799 13.4267 10.1095L12.6539 9.90153C11.1864 9.50659 9.63455 10.1384 8.86371 11.4495C8.67966 11.7625 8.49178 12.0826 8.3163 12.3822C7.24188 11.8473 6.72935 11.4908 5.69284 10.5382C4.79599 9.71382 4.04577 8.4042 3.69508 7.71962ZM9.21019 12.7685C10.3726 13.198 11.4466 13.4344 12.6092 13.5334C13.096 13.5749 13.5332 13.1706 13.5332 12.6231V11.5096C13.5332 11.291 13.3866 11.0997 13.1755 11.0429L12.4027 10.8349C11.3541 10.5527 10.2467 11.0044 9.69692 11.9394C9.53381 12.2168 9.3678 12.4995 9.21019 12.7685Z"/></svg>';

  // Inject minimal scoped styles (once) — only for things Tailwind can't do
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
  let statusText = state === "answered" ? "In progress" : state === "ringing" ? "Ringing..." : "Calling...";
  let initialDuration = activeCallData && activeCallData.call_time
    ? (() => { let p = activeCallData.call_time.split(":"); return p.length === 3 && p[0] === "00" ? p[1] + ":" + p[2] : activeCallData.call_time; })()
    : "--:--";

  // Build widget container
  let widget = document.createElement("div");
  widget.id = "smartflo-call-widget";
  widget.style.cssText = "position:fixed;bottom:24px;right:24px;z-index:20;transition:opacity 0.3s;";

  // ── Expanded view ──
  let expanded = document.createElement("div");
  expanded.id = "smartflo-expanded";
  expanded.className = "cw-enter flex flex-col gap-2 rounded-lg bg-surface-gray-7 p-4 pt-2.5 text-ink-gray-2 shadow-2xl";
  expanded.style.width = "280px";
  expanded.innerHTML = `
    <div class="flex items-center justify-between gap-1 text-base cursor-move select-none">
      <div class="flex items-center gap-2 flex-1 min-w-0">
        <div class="size-8 rounded-full bg-surface-gray-6 flex items-center justify-content text-ink-gray-4 shrink-0" style="display:flex;align-items:center;justify-content:center;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        </div>
        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium text-ink-white truncate">${destinationNumber}</div>
          <div class="flex items-center gap-1 text-xs">
            <div id="smartflo-dot" class="cw-pulse shrink-0" style="width:6px;height:6px;border-radius:50%;background:var(--surface-green-3,rgb(48,166,109))"></div>
            <span id="smartflo-call-status" style="color:var(--surface-green-3,rgb(48,166,109))">${statusText}</span>
          </div>
        </div>
      </div>
      <button id="smartflo-minimize-btn" class="size-7 rounded-md flex items-center justify-center text-ink-white hover:bg-surface-gray-6 shrink-0" style="border:none;background:transparent;cursor:pointer;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 12h14"/></svg>
      </button>
    </div>
    <div class="flex flex-col items-center py-4 gap-1">
      <div class="size-12 rounded-full bg-surface-gray-6 flex items-center justify-center text-ink-gray-4" style="display:flex;align-items:center;justify-content:center;">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
      </div>
      <div class="text-sm text-ink-gray-4">${destinationNumber}</div>
    </div>
    <div id="smartflo-call-duration" class="text-center text-sm text-ink-gray-4 pb-3" style="font-variant-numeric:tabular-nums;">${initialDuration}</div>
    <div class="flex justify-center pb-1">
      <button id="smartflo-hangup-btn" class="size-10 rounded-full bg-surface-red-5 hover:bg-surface-red-6 flex items-center justify-center text-ink-white" style="border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;">
        <span class="cw-hangup-icon" style="display:flex">${phoneIconSvg}</span>
      </button>
    </div>
  `;

  // ── Collapsed pill ──
  let pill = document.createElement("div");
  pill.id = "smartflo-pill";
  pill.className = "cw-enter flex cursor-pointer select-none items-center justify-between gap-1 rounded-full bg-surface-gray-7 px-2 text-base text-ink-gray-2";
  pill.style.cssText = "padding-top:7px;padding-bottom:7px;display:none;";
  pill.innerHTML = `
    <div class="size-5 rounded-full bg-surface-gray-6 flex items-center justify-center text-ink-gray-4 shrink-0" style="display:flex;align-items:center;justify-content:center;">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
    </div>
    <span id="smartflo-pill-number" class="text-xs text-ink-white" style="white-space:nowrap;max-width:120px;overflow:hidden;text-overflow:ellipsis;">${destinationNumber}</span>
    <span class="text-xs text-ink-gray-4">&middot;</span>
    <span id="smartflo-pill-duration" class="text-xs text-ink-gray-4" style="font-variant-numeric:tabular-nums;">${initialDuration}</span>
    <button id="smartflo-pill-hangup" class="size-6 rounded-full bg-surface-red-5 hover:bg-surface-red-6 flex items-center justify-center text-ink-white shrink-0" style="border:none;cursor:pointer;margin-left:2px;display:flex;align-items:center;justify-content:center;">
      <span class="cw-hangup-icon" style="display:flex"><svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor"><path fill-rule="evenodd" clip-rule="evenodd" d="M2.67754 2.70675C2.53628 2.84008 2.44787 3.03363 2.46988 3.29885C2.47828 3.40004 2.4869 3.50717 2.49497 3.61981C2.63494 4.75003 2.9076 5.83579 3.29638 6.82863L4.1395 6.29907C5.02533 5.74269 5.45257 4.67951 5.19805 3.66489L4.98918 2.83225C4.93526 2.61729 4.74204 2.46656 4.52043 2.46656H3.36772C3.06265 2.46656 2.82575 2.56686 2.67754 2.70675ZM3.69508 7.71962L4.6536 7.11757C5.89375 6.33864 6.49189 4.85019 6.13556 3.42971L5.9267 2.59708C5.76493 1.9522 5.18528 1.5 4.52043 1.5H3.36772C2.85467 1.5 2.368 1.66981 2.01409 2.00386C1.65323 2.34447 1.46097 2.82869 1.50663 3.3788C1.51521 3.48212 1.52381 3.58915 1.53174 3.70087L1.53262 3.71327L1.53414 3.72561C1.70903 5.14795 2.08181 6.51379 2.62992 7.73832C2.8107 8.1422 3.76654 10.0804 5.03876 11.2498C6.27205 12.3833 6.85696 12.7556 8.29758 13.4488L8.31072 13.4551L8.32421 13.4606C9.77742 14.0548 11.0901 14.3742 12.5272 14.4965C13.6361 14.5909 14.4998 13.677 14.4998 12.6231V11.5096C14.4998 10.8539 14.0598 10.2799 13.4267 10.1095L12.6539 9.90153C11.1864 9.50659 9.63455 10.1384 8.86371 11.4495C8.67966 11.7625 8.49178 12.0826 8.3163 12.3822C7.24188 11.8473 6.72935 11.4908 5.69284 10.5382C4.79599 9.71382 4.04577 8.4042 3.69508 7.71962ZM9.21019 12.7685C10.3726 13.198 11.4466 13.4344 12.6092 13.5334C13.096 13.5749 13.5332 13.1706 13.5332 12.6231V11.5096C13.5332 11.291 13.3866 11.0997 13.1755 11.0429L12.4027 10.8349C11.3541 10.5527 10.2467 11.0044 9.69692 11.9394C9.53381 12.2168 9.3678 12.4995 9.21019 12.7685Z"/></svg></span>
    </button>
  `;

  widget.appendChild(expanded);
  widget.appendChild(pill);
  document.body.appendChild(widget);

  // ── Minimize / Expand toggle ──
  function toggleMinimize() {
    isMinimized = !isMinimized;
    expanded.style.display = isMinimized ? "none" : "";
    pill.style.display = isMinimized ? "flex" : "none";
  }

  document.getElementById("smartflo-minimize-btn").addEventListener("click", toggleMinimize);
  pill.addEventListener("click", (e) => {
    // Don't expand if clicking the hangup button
    if (e.target.closest("#smartflo-pill-hangup")) return;
    toggleMinimize();
  });

  // ── Drag to reposition ────────────────────────────────────────
  let dragHeader = expanded.querySelector(".cursor-move");
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let widgetStartX = 0;
  let widgetStartY = 0;

  dragHeader.addEventListener("mousedown", (e) => {
    // Don't drag when clicking the minimize button
    if (e.target.closest("#smartflo-minimize-btn")) return;
    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    let rect = widget.getBoundingClientRect();
    widgetStartX = rect.left;
    widgetStartY = rect.top;
    // Switch from bottom/right to top/left positioning on first drag
    widget.style.bottom = "auto";
    widget.style.right = "auto";
    widget.style.left = widgetStartX + "px";
    widget.style.top = widgetStartY + "px";
    e.preventDefault();
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    let dx = e.clientX - dragStartX;
    let dy = e.clientY - dragStartY;
    widget.style.left = (widgetStartX + dx) + "px";
    widget.style.top = (widgetStartY + dy) + "px";
  });

  document.addEventListener("mouseup", () => {
    isDragging = false;
  });

  // ── Local tick timer ──────────────────────────────────────────
  // Syncs to API call_time on each poll, ticks locally between polls
  let lastKnownSeconds = 0; // total seconds from last API call_time
  let lastSyncedAt = 0;     // Date.now() when we last synced
  let tickTimer = null;

  function parseCallTime(callTime) {
    // "HH:MM:SS" → total seconds
    let parts = (callTime || "").split(":").map(Number);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return 0;
  }

  function formatDuration(totalSeconds) {
    let hrs = Math.floor(totalSeconds / 3600);
    let mins = Math.floor((totalSeconds % 3600) / 60);
    let secs = totalSeconds % 60;
    let mm = String(mins).padStart(2, "0");
    let ss = String(secs).padStart(2, "0");
    return hrs > 0 ? hrs + ":" + mm + ":" + ss : mm + ":" + ss;
  }

  function syncFromApi(callTime) {
    lastKnownSeconds = parseCallTime(callTime);
    lastSyncedAt = Date.now();
    // Start ticking if not already
    if (!tickTimer) {
      tickTimer = setInterval(tickDuration, 1000);
    }
  }

  function tickDuration() {
    let elapsed = Math.floor((Date.now() - lastSyncedAt) / 1000);
    let text = formatDuration(lastKnownSeconds + elapsed);
    let durationEl = document.getElementById("smartflo-call-duration");
    if (durationEl) durationEl.textContent = text;
    let pillDur = document.getElementById("smartflo-pill-duration");
    if (pillDur) pillDur.textContent = text;
  }

  // Seed from activeCallData if resuming
  if (activeCallData && activeCallData.call_time && state === "answered") {
    syncFromApi(activeCallData.call_time);
  }

  // ── Find our call in poll results ─────────────────────────────
  function findOurCall(liveCalls) {
    for (let c of liveCalls) {
      if (callId && c.call_id === callId) return c;
    }
    for (let c of liveCalls) {
      let dest = c.customer_number || c.destination || "";
      let destDigits = dest.replace(/\D/g, "").slice(-10);
      let ourDigits = destinationNumber.replace(/\D/g, "").slice(-10);
      if (destDigits && ourDigits && destDigits === ourDigits) {
        if (!callId) callId = c.call_id;
        return c;
      }
    }
    return null;
  }

  // ── Poll for live call status ─────────────────────────────────
  function pollCallStatus() {
    call(
      "tata_tele_service.tata_tele_service.doctype.tata_tele_settings.tata_tele_settings.get_live_calls",
      {},
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
        let greenColor = "var(--surface-green-3,rgb(48,166,109))";

        if (apiState.includes("answer") || apiState.includes("bridge")) {
          state = "answered";
          statusEl.textContent = "In progress";
          statusEl.style.color = greenColor;
          if (dotEl) dotEl.style.background = greenColor;
          if (ourCall.call_time) syncFromApi(ourCall.call_time);
        } else if (apiState.includes("ring") || apiState.includes("dial")) {
          state = "ringing";
          statusEl.textContent = "Ringing...";
          statusEl.style.color = greenColor;
          if (dotEl) dotEl.style.background = greenColor;
        } else {
          statusEl.textContent = ourCall.state || "Active";
          statusEl.style.color = "var(--text-ink-gray-4,rgb(153,153,153))";
        }
      } else if (state === "answered" || state === "ringing") {
        endCall("Call Ended");
      }
    }).catch(() => {});
  }

  pollTimer = setInterval(pollCallStatus, 4000);
  setTimeout(pollCallStatus, 2000);

  // ── Hang up ───────────────────────────────────────────────────
  function doHangup(btn) {
    if (btn) { btn.disabled = true; btn.style.opacity = "0.5"; btn.style.cursor = "not-allowed"; }
    if (callId) {
      call(
        "tata_tele_service.tata_tele_service.doctype.tata_tele_settings.tata_tele_settings.hangup_call",
        { call_id: callId },
      ).then(() => endCall("Call ended")).catch(() => endCall("Call ended"));
    } else {
      endCall("Call ended");
    }
  }

  document.getElementById("smartflo-hangup-btn").addEventListener("click", (e) => doHangup(e.currentTarget));
  document.getElementById("smartflo-pill-hangup").addEventListener("click", (e) => { e.stopPropagation(); doHangup(e.currentTarget); });

  function endCall(message) {
    stopPolling();
    let redColor = "var(--text-ink-red-3,rgb(181,42,42))";
    let statusEl = document.getElementById("smartflo-call-status");
    if (statusEl) {
      statusEl.textContent = message;
      statusEl.style.color = redColor;
      statusEl.classList.add("cw-blink");
    }
    let dotEl = document.getElementById("smartflo-dot");
    if (dotEl) { dotEl.style.background = redColor; dotEl.className = ""; }
    // Hide hangup buttons
    let hangup = document.getElementById("smartflo-hangup-btn");
    if (hangup) hangup.style.display = "none";
    let pillHangup = document.getElementById("smartflo-pill-hangup");
    if (pillHangup) pillHangup.style.display = "none";
    // Update pill text
    let pillDur = document.getElementById("smartflo-pill-duration");
    if (pillDur) { pillDur.textContent = message; pillDur.style.color = redColor; }
    // Auto-dismiss after 3 seconds
    setTimeout(() => {
      let w = document.getElementById("smartflo-call-widget");
      if (w) {
        w.style.opacity = "0";
        setTimeout(() => w.remove(), 300);
      }
    }, 3000);
  }

  function stopPolling() {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
    if (tickTimer) { clearInterval(tickTimer); tickTimer = null; }
  }
}
