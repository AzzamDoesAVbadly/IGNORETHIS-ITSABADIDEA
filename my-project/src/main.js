import "./styles.css";

document.documentElement.classList.add("js");

const routeProfiles = {
  about: {
    status: "RUN",
    mode: "Budget mode: humble and cheap",
    accent: "#f7d8ff",
    signal: 98.4
  },
  stack: {
    status: "TRACE",
    mode: "Stack mode: lean and local",
    accent: "#a6e3ff",
    signal: 96.1
  },
  plan: {
    status: "BURN",
    mode: "Plan mode: route-aware and testable",
    accent: "#ff9ac2",
    signal: 91.7
  },
  "lead-capture": {
    status: "CAPTURE",
    mode: "Lead mode: intent detection active",
    accent: "#c8ff92",
    signal: 99.2
  }
};

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const status = document.getElementById("route-status");
const mode = document.getElementById("route-mode");
const panel = document.getElementById("route-panel");
const meterValue = document.getElementById("meter-value");
const meterBar = document.getElementById("meter-bar");
const navLinks = document.querySelectorAll(".nav a[data-route]");

let currentRoute = null;
let baseSignal = routeProfiles.about.signal;

function setSignal(value) {
  meterValue.textContent = `${value.toFixed(1)}%`;
  meterBar.style.width = `${value}%`;
}

function renderRoute(route) {
  if (route === currentRoute || !routeProfiles[route]) return;
  currentRoute = route;
  const profile = routeProfiles[route];

  status.textContent = profile.status;
  status.setAttribute("data-text", profile.status);
  mode.textContent = profile.mode;

  panel.style.setProperty("--accent", profile.accent);
  baseSignal = profile.signal;
  setSignal(baseSignal);

  // Retrigger the glitch burst on every route change.
  status.classList.remove("burst");
  void status.offsetWidth;
  status.classList.add("burst");

  navLinks.forEach((link) => {
    link.classList.toggle("active", link.dataset.route === route);
  });
}

// Scroll-spy: the panel follows whichever section is in the middle of the viewport.
const spy = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) renderRoute(entry.target.dataset.route);
    });
  },
  { rootMargin: "-45% 0px -45% 0px" }
);
document.querySelectorAll("section[data-route]").forEach((section) => spy.observe(section));

renderRoute(window.location.hash.replace("#", "") || "about");

// Fade cards in as they scroll into view.
const revealer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        revealer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.15 }
);
document.querySelectorAll(".reveal").forEach((el) => revealer.observe(el));

// Live clock + date instead of a hardcoded one.
const clock = document.getElementById("route-clock");
const dateEl = document.getElementById("route-date");
function tick() {
  const now = new Date();
  clock.textContent = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  dateEl.textContent = now.toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" });
}
tick();
setInterval(tick, 1000);
document.getElementById("year").textContent = new Date().getFullYear();

// Let the signal meter breathe a little.
if (!reduceMotion) {
  setInterval(() => {
    const jitter = (Math.random() - 0.5) * 1.6;
    setSignal(Math.min(100, Math.max(0, baseSignal + jitter)));
  }, 1400);

  const glow = document.querySelector(".cursor-glow");
  window.addEventListener("pointermove", (event) => {
    glow.style.transform = `translate(${event.clientX}px, ${event.clientY}px)`;
  });
}

// Lead form: posts to Netlify Forms in the background so the page doesn't reload.
const form = document.getElementById("lead-form");
const formStatus = document.getElementById("form-status");

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = form.querySelector("button");
  const data = new FormData(form);

  if (!form.checkValidity()) {
    formStatus.textContent = "That email doesn't look right.";
    return;
  }

  button.disabled = true;
  button.textContent = "Sending…";
  formStatus.textContent = "";

  try {
    if (import.meta.env.DEV) {
      // Netlify Forms only exists on the deployed site.
      await new Promise((resolve) => setTimeout(resolve, 500));
      console.info("[dev] lead form submission skipped:", Object.fromEntries(data));
    } else {
      const response = await fetch("/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(data).toString()
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
    }
    form.reset();
    button.textContent = "Sent ✓";
    formStatus.textContent = "You're on the list. Signal received.";
    form.classList.add("success");
  } catch (error) {
    button.disabled = false;
    button.textContent = "Send";
    formStatus.textContent = "Couldn't send that — try again in a sec.";
  }
});
