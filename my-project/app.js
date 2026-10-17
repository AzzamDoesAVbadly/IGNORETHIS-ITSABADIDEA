const routeProfiles = {
  about: {
    status: "RUN",
    mode: "Budget mode: humble and cheap",
    date: "10/15/2026",
    accent: "#f7d8ff"
  },
  stack: {
    status: "TRACE",
    mode: "Stack mode: lean and local",
    date: "10/15/2026",
    accent: "#a6e3ff"
  },
  plan: {
    status: "BURN",
    mode: "Plan mode: route-aware and testable",
    date: "10/15/2026",
    accent: "#ff9ac2"
  },
  "lead-capture": {
    status: "CAPTURE",
    mode: "Lead mode: intent detection active",
    date: "10/15/2026",
    accent: "#c8ff92"
  }
};

function getRoute() {
  const hash = window.location.hash.replace("#", "");
  return hash || "about";
}

function renderRouteState() {
  const route = getRoute();
  const profile = routeProfiles[route] || routeProfiles.about;

  const status = document.getElementById("route-status");
  const mode = document.getElementById("route-mode");
  const panel = document.getElementById("route-panel");

  if (status) {
    status.textContent = profile.status;
    status.setAttribute("data-text", profile.status);
  }

  if (mode) mode.textContent = profile.mode;

  if (panel) {
    panel.style.boxShadow = `0 0 26px ${profile.accent}24`;
    panel.style.borderColor = `${profile.accent}55`;
  }

  document.querySelectorAll(".plan-box").forEach((box) => {
    box.classList.remove("active");
  });

  const activePlan = document.querySelectorAll(".plan-box")[route === "plan" ? 1 : 0];
  if (activePlan) {
    activePlan.classList.add("active");
  }
}

window.addEventListener("hashchange", renderRouteState);
renderRouteState();

document.getElementById("lead-form")?.addEventListener("submit", (event) => {
  event.preventDefault();

  const email = document.querySelector('input[name="email"]')?.value.trim();
  const button = event.currentTarget.querySelector("button");

  if (!email) return;

  button.textContent = "Sent";
  button.disabled = true;
});