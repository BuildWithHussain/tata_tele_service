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
            html: '<div style="margin-top:8px"><label class="text-sm text-ink-gray-5" style="display:block;margin-bottom:4px">Product</label><div style="position:relative"><input id="aionion-product-input" type="text" class="form-input" style="width:100%;padding:8px;border:1px solid var(--gray-300);border-radius:8px;font-size:14px" placeholder="Search..." autocomplete="off" /></div></div>',
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
          setTimeout(() => {
            let input = document.getElementById("aionion-product-input");
            let dropdown = document.createElement("div");
            dropdown.id = "aionion-product-dropdown";
            dropdown.style.cssText = "display:none;position:fixed;max-height:200px;overflow-y:auto;background:white;border:1px solid var(--gray-300);border-radius:8px;margin-top:4px;z-index:9999;box-shadow:0 4px 6px rgba(0,0,0,0.1)";
            document.body.appendChild(dropdown);
            let debounceTimer = null;
            function doSearch() {
              clearTimeout(debounceTimer);
              debounceTimer = setTimeout(() => {
                call("frappe.desk.search.search_link", {
                  doctype: "Aionion Product",
                  txt: input.value || "",
                }).then((results) => {
                  if (!results || !results.length) {
                    dropdown.style.display = "none";
                    return;
                  }
                  dropdown.innerHTML = results.map((r) => '<div class="aionion-opt" data-value="' + r.value + '" style="padding:8px 12px;cursor:pointer;font-size:14px">' + r.value + (r.description ? ' <span style="color:var(--gray-500);font-size:12px">' + r.description + '</span>' : '') + '</div>').join("");
                  let rect = input.getBoundingClientRect();
                  dropdown.style.top = rect.bottom + 4 + "px";
                  dropdown.style.left = rect.left + "px";
                  dropdown.style.width = rect.width + "px";
                  dropdown.style.display = "block";
                  dropdown.querySelectorAll(".aionion-opt").forEach((opt) => {
                    opt.addEventListener("click", () => {
                      selectedProduct = opt.dataset.value;
                      input.value = selectedProduct;
                      dropdown.style.display = "none";
                    });
                    opt.addEventListener("mouseenter", () => { opt.style.background = "var(--gray-100)"; });
                    opt.addEventListener("mouseleave", () => { opt.style.background = "transparent"; });
                  });
                });
              }, 300);
            }
            input.addEventListener("input", doSearch);
            input.addEventListener("focus", doSearch);
            document.addEventListener("click", (e) => {
              if (!input.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.style.display = "none";
              }
            });
          }, 100);
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

  // Inject scoped styles (once)
  if (!document.getElementById("smartflo-call-styles")) {
    let styleEl = document.createElement("style");
    styleEl.id = "smartflo-call-styles";
    styleEl.textContent = `
      .cw-root {
        --cw-bg: #111113;
        --cw-surface: #1a1a1f;
        --cw-border: rgba(255,255,255,0.06);
        --cw-text: #f0eeeb;
        --cw-text-dim: rgba(240,238,235,0.5);
        --cw-green: #34d399;
        --cw-red: #f43f5e;
        --cw-red-dim: rgba(244,63,94,0.15);

        position: fixed; bottom: 24px; right: 24px; z-index: 10000;
        width: 280px;
        background: var(--cw-bg);
        color: var(--cw-text);
        font-family: 'Instrument Sans', -apple-system, BlinkMacSystemFont, sans-serif;
        border: 1px solid var(--cw-border);
        border-radius: 20px;
        overflow: hidden;
        box-shadow: 0 0 0 1px rgba(0,0,0,0.3), 0 4px 16px rgba(0,0,0,0.25), 0 16px 48px rgba(0,0,0,0.3);
        animation: cw-enter 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
        transition: opacity 0.3s;
      }
      @keyframes cw-enter {
        from { opacity: 0; transform: translateY(12px) scale(0.96); }
      }
      .cw-body { padding: 20px; }
      .cw-status-bar { display: flex; align-items: center; gap: 6px; margin-bottom: 20px; }
      .cw-status-dot {
        width: 6px; height: 6px; border-radius: 50%;
        background: var(--cw-green); box-shadow: 0 0 6px var(--cw-green);
        animation: cw-pulse 2s ease-in-out infinite;
      }
      @keyframes cw-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      .cw-status-text {
        font-size: 11px; font-weight: 600; letter-spacing: 0.06em;
        text-transform: uppercase; color: var(--cw-green);
      }
      .cw-call-type {
        margin-left: auto; font-size: 10px; font-weight: 500;
        letter-spacing: 0.04em; text-transform: uppercase; color: var(--cw-text-dim);
      }
      .cw-duration {
        text-align: center; padding: 8px 0 20px;
        font-family: 'DM Mono', monospace; font-size: 44px; font-weight: 300;
        color: var(--cw-text); letter-spacing: 0.04em; line-height: 1;
      }
      .cw-contact {
        background: var(--cw-surface); border: 1px solid var(--cw-border);
        border-radius: 12px; padding: 12px 14px;
        display: flex; align-items: center; gap: 12px; margin-bottom: 20px;
      }
      .cw-avatar {
        width: 36px; height: 36px; border-radius: 10px;
        background: linear-gradient(135deg, #2a2a32, #1a1a22);
        border: 1px solid var(--cw-border);
        display: flex; align-items: center; justify-content: center; flex-shrink: 0;
      }
      .cw-avatar svg { opacity: 0.5; }
      .cw-details { flex: 1; min-width: 0; }
      .cw-number {
        font-size: 14px; font-weight: 600; color: var(--cw-text);
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis; letter-spacing: -0.01em;
      }
      .cw-label { font-size: 11px; color: var(--cw-text-dim); margin-top: 1px; font-weight: 500; }
      .cw-actions { display: flex; justify-content: center; }
      .cw-hangup {
        width: 52px; height: 52px; border-radius: 50%;
        background: var(--cw-red); border: none; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        transition: all 0.2s ease; position: relative;
      }
      .cw-hangup::before {
        content: ''; position: absolute; inset: -4px; border-radius: 50%;
        background: var(--cw-red-dim); z-index: -1; transition: all 0.2s ease;
      }
      .cw-hangup:hover { transform: scale(1.06); box-shadow: 0 4px 20px rgba(244,63,94,0.35); }
      .cw-hangup:hover::before { inset: -6px; }
      .cw-hangup:active { transform: scale(0.96); }
      .cw-hangup svg { width: 22px; height: 22px; }
    `;
    document.head.appendChild(styleEl);
  }

  // Load fonts (once)
  if (!document.getElementById("smartflo-call-fonts")) {
    let link = document.createElement("link");
    link.id = "smartflo-call-fonts";
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Instrument+Sans:wght@400;500;600;700&display=swap";
    document.head.appendChild(link);
  }

  let statusColor = state === "answered" ? "#34d399" : "#fbbf24";
  let statusText = state === "answered" ? "In Progress" : state === "ringing" ? "Ringing..." : "Calling...";
  let initialDuration = activeCallData && activeCallData.call_time
    ? (() => { let p = activeCallData.call_time.split(":"); return p.length === 3 && p[0] === "00" ? p[1] + ":" + p[2] : activeCallData.call_time; })()
    : "--:--";

  // Build widget HTML
  let widget = document.createElement("div");
  widget.id = "smartflo-call-widget";
  widget.className = "cw-root";
  widget.innerHTML = `
    <div class="cw-body">
      <div class="cw-status-bar">
        <div class="cw-status-dot" style="${state !== "answered" ? "background:#fbbf24;box-shadow:0 0 6px #fbbf24;" : ""}"></div>
        <span id="smartflo-call-status" class="cw-status-text" style="color:${statusColor}">${statusText}</span>
        <span class="cw-call-type">Outgoing</span>
      </div>
      <div id="smartflo-call-duration" class="cw-duration" style="color:${state === "answered" ? "var(--cw-text)" : "var(--cw-text-dim)"}">
        ${initialDuration}
      </div>
      <div class="cw-contact">
        <div class="cw-avatar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
          </svg>
        </div>
        <div class="cw-details">
          <div id="smartflo-call-number" class="cw-number">${destinationNumber}</div>
          <div id="smartflo-call-label" class="cw-label"></div>
        </div>
      </div>
      <div class="cw-actions">
        <button id="smartflo-hangup-btn" class="cw-hangup">
          <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91"/>
            <line x1="1" y1="1" x2="23" y2="23"/>
          </svg>
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(widget);

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
    let durationEl = document.getElementById("smartflo-call-duration");
    if (!durationEl) return;
    let elapsed = Math.floor((Date.now() - lastSyncedAt) / 1000);
    durationEl.textContent = formatDuration(lastKnownSeconds + elapsed);
    durationEl.style.color = "#f0eeeb";
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

        let dotEl = widget.querySelector(".cw-status-dot");
        if (apiState.includes("answer") || apiState.includes("bridge")) {
          state = "answered";
          statusEl.textContent = "In Progress";
          statusEl.style.color = "#34d399";
          if (dotEl) { dotEl.style.background = "#34d399"; dotEl.style.boxShadow = "0 0 6px #34d399"; }
          if (ourCall.call_time) {
            syncFromApi(ourCall.call_time);
          }
        } else if (apiState.includes("ring") || apiState.includes("dial")) {
          state = "ringing";
          statusEl.textContent = "Ringing...";
          statusEl.style.color = "#fbbf24";
          if (dotEl) { dotEl.style.background = "#fbbf24"; dotEl.style.boxShadow = "0 0 6px #fbbf24"; }
        } else {
          statusEl.textContent = ourCall.state || "Active";
          statusEl.style.color = "rgba(240,238,235,0.5)";
        }

        if (ourCall.agent_name) {
          let labelEl = document.getElementById("smartflo-call-label");
          if (labelEl && !labelEl.textContent) {
            labelEl.textContent = ourCall.agent_name;
          }
        }
      } else if (state === "answered" || state === "ringing") {
        endCall("Call Ended");
      }
    }).catch(() => {});
  }

  pollTimer = setInterval(pollCallStatus, 4000);
  setTimeout(pollCallStatus, 2000);

  // ── Hang up ───────────────────────────────────────────────────
  let hangupBtn = document.getElementById("smartflo-hangup-btn");
  if (hangupBtn) {
    hangupBtn.addEventListener("click", () => {
      hangupBtn.disabled = true;
      hangupBtn.style.opacity = "0.5";
      hangupBtn.style.cursor = "not-allowed";

      if (callId) {
        call(
          "tata_tele_service.tata_tele_service.doctype.tata_tele_settings.tata_tele_settings.hangup_call",
          { call_id: callId },
        ).then(() => {
          endCall("Call Ended");
        }).catch(() => {
          endCall("Call Ended");
        });
      } else {
        endCall("Call Ended");
      }
    });
  }

  function endCall(message) {
    stopPolling();
    let statusEl = document.getElementById("smartflo-call-status");
    if (statusEl) {
      statusEl.textContent = message;
      statusEl.style.color = "#f43f5e";
    }
    let dotEl = widget.querySelector(".cw-status-dot");
    if (dotEl) { dotEl.style.background = "#f43f5e"; dotEl.style.boxShadow = "0 0 6px #f43f5e"; dotEl.style.animation = "none"; }
    let hangup = document.getElementById("smartflo-hangup-btn");
    if (hangup) hangup.style.display = "none";
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
