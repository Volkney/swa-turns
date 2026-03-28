const text = document.getElementById("turn-times");
const boton = document.getElementById("boton");

boton.addEventListener("click", () => {
  const lines = text.value
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "");

  const result = {};

  for (let i = 0; i < lines.length; i++) {
    const label = lines[i];
    const nextLine = lines[i + 1];

    if (/^\d{2}:\d{2}$/.test(nextLine)) {
      const key = formatKey(label);
      const value = parseTime(nextLine);
      result[key] = { mins: value, raw: nextLine };
      i++;
    }
  }

  const durations = {
    deboarding: {
      mins: result.paxBoardingStarted.mins - result.paxDeboardingStarted.mins,
      from: result.paxDeboardingStarted.raw,
      to: result.paxBoardingStarted.raw,
    },
    boarding: {
      mins: result.paxBoardingEnded.mins - result.paxBoardingStarted.mins,
      from: result.paxBoardingStarted.raw,
      to: result.paxBoardingEnded.raw,
    },
    scanToPWB: {
      mins: result.pwbSent.mins - result.paxBoardingEnded.mins,
      from: result.paxBoardingEnded.raw,
      to: result.pwbSent.raw,
    },
    pwbToDoors: {
      mins: result.doorsClosed.mins - result.pwbSent.mins,
      from: result.pwbSent.raw,
      to: result.doorsClosed.raw,
    },
  };

  const total = Object.values(durations).reduce((a, b) => a + b.mins, 0);

  const combinedBar = document.getElementById("combined-bar");
  const labelsBar = document.getElementById("labels-bar");

  combinedBar.innerHTML = "";
  labelsBar.innerHTML = "";

  const labelMap = {
    deboarding: "Deboarding",
    boarding: "Boarding",
    scanToPWB: "LS → PWB",
    pwbToDoors: "PWB → DC",
  };

  for (const [key, data] of Object.entries(durations)) {
    const widthPercent = (data.mins / total) * 100;

    const segment = document.createElement("div");
    segment.className = `segment ${key}`;
    segment.style.width = `${widthPercent}%`;
    segment.textContent = `${data.mins}m`;
    combinedBar.appendChild(segment);

    const label = document.createElement("div");
    label.className = "label";
    label.style.width = `${widthPercent}%`;
    label.innerHTML = `${labelMap[key]}<br><span style="opacity:0.5">${data.from}–${data.to}</span>`;
    labelsBar.appendChild(label);
  }
  // ── Copy button ──
  const fs = result.paxBoardingStarted.raw;
  const ls = result.paxBoardingEnded.raw;
  const pwb = result.pwbSent.raw;
  const copyText = `FS ${fs} LS ${ls} PWB ${pwb}`;

  let copyBtn = document.getElementById("copy-btn");
  if (!copyBtn) {
    copyBtn = document.createElement("button");
    copyBtn.id = "copy-btn";
    document.querySelector(".progress-container").appendChild(copyBtn);
  }

  copyBtn.textContent = `Copy  ·  ${copyText}`;
  copyBtn.onclick = () => {
    navigator.clipboard.writeText(copyText).then(() => {
      copyBtn.textContent = "Copied!";
      setTimeout(() => {
        copyBtn.textContent = `Copy  ·  ${copyText}`;
      }, 2000);
    });
  };
});

function formatKey(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .split(" ")
    .map((word, index) =>
      index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join("");
}

function parseTime(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}
