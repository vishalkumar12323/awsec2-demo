async function fetchJSON(url, opts = {}) {
  const start = performance.now();
  const res = await fetch(url, opts);
  const latency = Math.round(performance.now() - start);
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data, latency };
}

function setText(id, value) {
  document.getElementById(id).textContent = value;
}

function setHealth(ok) {
  const el = document.getElementById("health");
  el.classList.remove("ok", "warn", "bad");
  if (ok) {
    el.classList.add("ok");
    el.textContent = "Healthy";
  } else {
    el.classList.add("bad");
    el.textContent = "Unhealthy";
  }
}

async function refresh() {
  // Health endpoint (used by ELB too)
  const health = await fetchJSON("/health");
  setHealth(health.ok);

  // Instance metadata (which box answered)
  const meta = await fetchJSON("/meta");
  if (meta.ok) {
    setText("instance", meta.data.instanceId || "unknown");
    setText("az", meta.data.az || "unknown");
  } else {
    setText("instance", "—");
    setText("az", "—");
  }

  // Time endpoint + measure latency
  const time = await fetchJSON("/api/time");
  if (time.ok) {
    setText("time", new Date(time.data.now).toLocaleString());
    setText("latency", time.latency + " ms");
  } else {
    setText("time", "—");
    setText("latency", "—");
  }
}

document.getElementById("refresh").addEventListener("click", refresh);
window.addEventListener("load", refresh);
