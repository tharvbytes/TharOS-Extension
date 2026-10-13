const $ = (selector) => document.querySelector(selector);

const clock = $("#clock");
const date = $("#date");
const taskbarClock = $("#taskbarClock");

const powerButton = $("#powerButton");
const powerMenu = $("#powerMenu");

const sleepScreen = $("#sleepScreen");
const shutdownScreen = $("#shutdownScreen");

function updateClock() {
  const now = new Date();

  clock.textContent = now.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });

  taskbarClock.textContent = now.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });

  date.textContent = now.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

updateClock();
setInterval(updateClock, 1000);

// Internet connectivity indicator.
// This reports the browser's network connection state,
// not whether a particular website is reachable.

function updateInternetStatus() {
  const online = navigator.onLine;

  $("#internetDot").classList.toggle("offline", !online);
  $("#taskbarDot").classList.toggle("offline", !online);

  $("#internetStatus").textContent = online ? "Internet connected" : "Offline";
  $("#taskbarInternet").textContent = online ? "Online" : "Offline";
}

window.addEventListener("online", updateInternetStatus);
window.addEventListener("offline", updateInternetStatus);

updateInternetStatus();

// Power menu

function togglePowerMenu(force) {
  const shouldOpen =
    typeof force === "boolean"
      ? force
      : powerMenu.classList.contains("hidden");

  powerMenu.classList.toggle("hidden", !shouldOpen);
  powerButton.setAttribute("aria-expanded", String(shouldOpen));
}

powerButton.addEventListener("click", (event) => {
  event.stopPropagation();
  togglePowerMenu();
});

powerMenu.addEventListener("click", (event) => {
  event.stopPropagation();
});

document.addEventListener("click", (event) => {
  if (
    !powerMenu.contains(event.target) &&
    !powerButton.contains(event.target)
  ) {
    togglePowerMenu(false);
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    togglePowerMenu(false);
  }
});


$("#fullscreenButton").addEventListener("click", () => {
  chrome.runtime.sendMessage(
    { action: "FULLSCREEN" },
    (response) => {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError.message);
      }
    }
  );
});

const downloadsApp = document.getElementById("downloadsApp");

downloadsApp?.addEventListener("click", openDownloads);


// // Downloads

function openDownloads() {
  togglePowerMenu(false);

  chrome.runtime.sendMessage(
    { action: "OPEN_DOWNLOADS" },
    (response) => {
      if (chrome.runtime.lastError) {
        console.error(
          "TharOS Downloads error:",
          chrome.runtime.lastError.message
        );
        return;
      }

      if (!response?.success) {
        console.error("Failed to open Downloads.");
      }
    }
  );
}

$("#downloadsButton").addEventListener("click", openDownloads);


// Sleep: hide the desktop and show a wake-up screen.
// This does not minimize the actual browser window.

$("#sleepButton").addEventListener("click", () => {
  togglePowerMenu(false);
  sleepScreen.classList.remove("hidden");
});

$("#wakeButton").addEventListener("click", () => {
  sleepScreen.classList.add("hidden");
});

// Shutdown: show a shutdown screen inside the tab.
// The browser and computer remain running.

$("#shutdownButton").addEventListener("click", () => {
  togglePowerMenu(false);

  const confirmed = confirm(
    "Would you like to shutdown TharOS?"
  );

  if (!confirmed) return;

  chrome.runtime.sendMessage(
    { action: "SHUTDOWN" },
    (response) => {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError.message);
      }
    }
  );
});

$("#restartButton").addEventListener("click", () => {
  shutdownScreen.classList.add("hidden");
});

// Prevent accidental dragging of application icons.

document.querySelectorAll(".app").forEach((app) => {
  app.addEventListener("dragstart", (event) => {
    event.preventDefault();
  });
});
