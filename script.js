const SEGMENTS = [
  {
    key: "deboarding",
    label: "Deboarding",
    patterns: [/deboarding\s+started/i, /pax\s+deboard/i],
    color: "#58a6ff",
  },
  {
    key: "boarding_start",
    label: "Boarding",
    patterns: [/boarding\s+started/i, /pax\s+boarding\s+start/i],
    color: "#3fb950",
  },
  {
    key: "boarding_end",
    label: "End boarding → PWB",
    patterns: [/boarding\s+ended/i, /boarding\s+end/i, /final\s+boarding/i],
    color: "#d29922",
  },
  {
    key: "pwb",
    label: "PWB → Doors closed",
    patterns: [/pwb\s+sent/i, /pwb/i],
    color: "#f78166",
  },
  {
    key: "doors",
    label: "Doors closed",
    patterns: [/doors?\s+closed/i],
    color: null,
  },
];

function toMins(t) {
  const m = t.match(/(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return parseInt(m[1]) * 60 + parseInt(m[2]);
}

function fmtTime(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function analyze() {
  const raw = document.getElementById("input").value;
  const errEl = document.getElementById("error");
  const out = document.getElementById("output");
  errEl.style.display = "none";

  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const found = {};

  lines.forEach((line) => {
    const timeMatch = line.match(/(\d{1,2}:\d{2})/);
    if (!timeMatch) return;
    const time = timeMatch[1];
    SEGMENTS.forEach((seg) => {
      if (found[seg.key]) return;
      seg.patterns.forEach((p) => {
        if (p.test(line)) found[seg.key] = time;
      });
    });
  });

  const required = [
    "deboarding",
    "boarding_start",
    "boarding_end",
    "pwb",
    "doors",
  ];
  const missing = required.filter((k) => !found[k]);
  if (missing.length > 0) {
    const names = {
      deboarding: "Deboarding started",
      boarding_start: "Boarding started",
      boarding_end: "Boarding ended",
      pwb: "PWB Sent",
      doors: "Doors closed",
    };
    errEl.textContent =
      "Could not find: " + missing.map((k) => names[k]).join(", ");
    errEl.style.display = "block";
    return;
  }

  const t = {
    deboard: toMins(found.deboarding),
    bstart: toMins(found.boarding_start),
    bend: toMins(found.boarding_end),
    pwb: toMins(found.pwb),
    doors: toMins(found.doors),
  };

  const segs = [
    {
      label: "Deboarding",
      from: found.deboarding,
      to: found.boarding_start,
      mins: t.bstart - t.deboard,
      color: "#58a6ff",
    },
    {
      label: "Boarding",
      from: found.boarding_start,
      to: found.boarding_end,
      mins: t.bend - t.bstart,
      color: "#3fb950",
    },
    {
      label: "End boarding → PWB",
      from: found.boarding_end,
      to: found.pwb,
      mins: t.pwb - t.bend,
      color: "#d29922",
    },
    {
      label: "PWB → Doors closed",
      from: found.pwb,
      to: found.doors,
      mins: t.doors - t.pwb,
      color: "#f78166",
    },
  ];

  const total = segs.reduce((a, s) => a + s.mins, 0);
  const longest = segs.reduce((a, s) => (s.mins > a.mins ? s : a), segs[0]);

  // Build bar
  const barHTML = segs
    .map((s) => {
      const pct = ((s.mins / total) * 100).toFixed(1);
      return `<div class="bar-segment" style="width:${pct}%; background:${s.color};">${s.mins}m</div>`;
    })
    .join("");

  // Build legend labels aligned to bar
  const gridCols = segs
    .map((s) => `${((s.mins / total) * 100).toFixed(1)}fr`)
    .join(" ");
  const labelsHTML = segs
    .map(
      (s) =>
        `<div class="seg-label-item"><div class="seg-label-name">${s.label}</div>${s.from} – ${s.to}</div>`,
    )
    .join("");

  // Stats
  const statsHTML = segs
    .map(
      (s) => `
      <div class="stat-card">
        <div class="stat-label">${s.label}</div>
        <div class="stat-value" style="color:${s.color}">${s.mins}<span style="font-size:13px;color:#7d8590"> min</span></div>
        <div class="stat-sub">${s.from} → ${s.to}</div>
      </div>
    `,
    )
    .join("");

  out.innerHTML = `
      <div class="bar-section">
        <label>Turn time breakdown — ${total} min total</label>
        <div class="bar-wrapper">${barHTML}</div>
        <div class="seg-labels" style="grid-template-columns:${gridCols}">${labelsHTML}</div>
      </div>
      <div class="stats">${statsHTML}</div>
      <div class="legend">
        <div style="font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:#7d8590;margin-bottom:4px;">Longest phase</div>
        <div style="font-size:13px;color:${longest.color}">▶ ${longest.label} at ${longest.mins} min (${((longest.mins / total) * 100).toFixed(0)}% of turn)</div>
      </div>
    `;
}
