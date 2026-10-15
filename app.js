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
    closeAppWindows();
  }
});


const appDrawer = $("#appDrawer");
const appWindow = $("#appWindow");
const appWindowBody = $("#appWindowBody");
const installedAppsElement = $("#installedApps");
const storeAppsElement = $("#storeApps");
const drawerNotice = $("#drawerNotice");
const customAppStorageKey = "tharos.customApps";
const installedAppStorageKey = "tharos.installedApps";

const builtinApps = [
  { id: "explorer", name: "Explorer", description: "Browse your downloads", emoji: "📁", kind: "explorer" },
  { id: "downloads", name: "Downloads", description: "Downloaded files", emoji: "⬇️", kind: "downloads" },
  { id: "support", name: "Support", description: "Help and support", emoji: "💜", url: "https://tharvesh2026.github.io/" }
];

const storeCatalog = [
  { id: "photopea", name: "Photopea", url: "https://www.photopea.com/", emoji: "🎨" },
  { id: "canva", name: "Canva", url: "https://www.canva.com/", emoji: "🖌️" },
  { id: "whatsapp", name: "WhatsApp", url: "https://web.whatsapp.com/", emoji: "💬" },
  { id: "telegram", name: "Telegram", url: "https://web.telegram.org/", emoji: "✈️" },
  { id: "slack", name: "Slack", url: "https://app.slack.com/", emoji: "💼" },
  { id: "medium", name: "Medium", url: "https://medium.com/", emoji: "✍️" },
  { id: "devto", name: "dev.to", url: "https://dev.to/", emoji: "👩‍💻" },
  { id: "youtube", name: "YouTube", url: "https://www.youtube.com/", emoji: "▶️" },
  { id: "google-docs", name: "Google Docs", url: "https://docs.google.com/document/", emoji: "📄" },
  { id: "google-sheets", name: "Google Sheets", url: "https://docs.google.com/spreadsheets/", emoji: "📊" },
  { id: "google-slides", name: "Google Slides", url: "https://docs.google.com/presentation/", emoji: "📽️" },
  { id: "gmail", name: "Gmail", url: "https://mail.google.com/", emoji: "✉️" },
  { id: "google-chrome", name: "Google Chrome", url: "https://www.google.com/chrome/", emoji: "🌐" },
  { id: "bing", name: "Bing", url: "https://www.bing.com/", emoji: "🔎" },
  { id: "brave-search", name: "Brave Search", url: "https://search.brave.com/", emoji: "🦁" },
  { id: "wikipedia", name: "Wikipedia", url: "https://www.wikipedia.org/", emoji: "🌍" }
];

function extensionMessage(message) {
  return new Promise((resolve, reject) => {
    if (!globalThis.chrome?.runtime?.sendMessage) {
      reject(new Error("TharOS extension APIs are unavailable."));
      return;
    }

    chrome.runtime.sendMessage(message, (response) => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
      } else {
        resolve(response);
      }
    });
  });
}

function reportDrawerMessage(message, isError = false) {
  drawerNotice.textContent = message;
  drawerNotice.classList.toggle("error", isError);
}

function readAppList(key) {
  const value = localStorage.getItem(key);
  if (!value) return [];
  const parsed = JSON.parse(value);
  if (!Array.isArray(parsed)) throw new Error(`Invalid saved app list: ${key}`);
  return parsed;
}

function writeAppList(key, apps) {
  localStorage.setItem(key, JSON.stringify(apps));
}

function readStoredApps(key) {
  try {
    return readAppList(key).map((app) => {
      if (!app || typeof app !== "object" || typeof app.name !== "string" || !app.name.trim()) {
        throw new Error(`Invalid saved app in ${key}`);
      }
      if (typeof app.url !== "string") throw new Error(`Invalid saved app URL in ${key}`);
      return {
        ...app,
        url: safeWebUrl(app.url),
        iconUrl: app.iconUrl ? safeWebUrl(app.iconUrl) : ""
      };
    });
  } catch (error) {
    console.error("Unable to read TharOS apps:", error);
    reportDrawerMessage("Saved apps could not be loaded. Check browser storage settings.", true);
    return [];
  }
}

function safeWebUrl(value) {
  const url = new URL(value);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Use a web address starting with http:// or https://.");
  }
  return url.href;
}

function makeAppTile(app, { remove = false, installed = false } = {}) {
  const tile = document.createElement("article");
  tile.className = "drawer-app-tile";
  const launch = document.createElement("button");
  launch.type = "button";
  launch.className = "drawer-app-launch";
  launch.title = `Open ${app.name}`;

  if (app.desktopElement) {
    const desktopIcon = app.desktopElement.querySelector(".app-icon");
    if (desktopIcon) {
      const icon = desktopIcon.cloneNode(true);
      icon.className = "drawer-app-icon";
      icon.style.background = getComputedStyle(desktopIcon).background;
      icon.style.border = getComputedStyle(desktopIcon).border;
      launch.append(icon);
    } else {
      launch.append(makeEmojiIcon(app.emoji || app.name.slice(0, 1)));
    }
  } else if (app.iconUrl) {
    const icon = document.createElement("img");
    icon.className = "drawer-app-icon";
    icon.src = app.iconUrl;
    icon.alt = "";
    icon.onerror = () => {
      icon.replaceWith(makeEmojiIcon(app.emoji || app.name.slice(0, 1)));
    };
    launch.append(icon);
  } else {
    launch.append(makeEmojiIcon(app.emoji || app.name.slice(0, 1)));
  }

  const title = document.createElement("strong");
  title.textContent = app.name;
  const detail = document.createElement("small");
  detail.textContent = app.description || (app.url ? new URL(app.url).hostname : "TharOS app");
  launch.append(title, detail);
  launch.addEventListener("click", () => launchApp(app));
  tile.append(launch);

  if (remove) {
    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "remove-app";
    removeButton.textContent = "Remove";
    removeButton.setAttribute("aria-label", `Remove ${app.name}`);
    removeButton.addEventListener("click", () => removeInstalledApp(app.id));
    tile.append(removeButton);
  } else if (installed) {
    const status = document.createElement("span");
    status.className = "installed-label";
    status.textContent = "Installed";
    tile.append(status);
  }
  return tile;
}

function makeEmojiIcon(emoji) {
  const icon = document.createElement("span");
  icon.className = "drawer-app-icon emoji-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = emoji;
  return icon;
}

function installedDesktopApps() {
  return Array.from(document.querySelectorAll("#desktop .app[href]")).map((element, index) => ({
    id: `desktop-${index}`,
    name: element.querySelector("span")?.textContent.trim() || element.title,
    description: element.querySelector("small")?.textContent.trim() || "",
    url: element.href,
    emoji: element.querySelector(".app-icon")?.textContent.trim() || "◈",
    desktopElement: element
  }));
}

function renderDrawer() {
  installedAppsElement.replaceChildren();
  storeAppsElement.replaceChildren();
  const customApps = readStoredApps(customAppStorageKey);
  const installedApps = readStoredApps(installedAppStorageKey);
  const desktopApps = installedDesktopApps();

  [...builtinApps, ...desktopApps, ...installedApps, ...customApps].forEach((app) => {
    installedAppsElement.append(makeAppTile(app, {
      remove: Boolean(app.custom || app.storeApp)
    }));
  });

  const installedIds = new Set(installedApps.map((app) => app.id));
  storeCatalog.forEach((app) => {
    const isInstalled = installedIds.has(app.id);
    storeAppsElement.append(makeAppTile(app, { installed: isInstalled }));
    const tile = storeAppsElement.lastElementChild;
    const launch = tile.querySelector(".drawer-app-launch");
    launch.disabled = isInstalled;
    launch.title = isInstalled ? `${app.name} is installed` : `Preview ${app.name}`;
    if (isInstalled) {
      launch.addEventListener("click", (event) => event.preventDefault());
    }
    const installButton = document.createElement("button");
    installButton.type = "button";
    installButton.className = "drawer-action install-button";
    installButton.textContent = isInstalled ? "Installed" : "Install";
    installButton.disabled = isInstalled;
    installButton.addEventListener("click", () => installApp(app));
    tile.append(installButton);
  });
}

function selectDrawerTab(name) {
  document.querySelectorAll("[data-drawer-tab]").forEach((tab) => {
    const selected = tab.dataset.drawerTab === name;
    tab.classList.toggle("active", selected);
    tab.setAttribute("aria-selected", String(selected));
  });
  document.querySelectorAll("[data-drawer-pane]").forEach((pane) => {
    const selected = pane.dataset.drawerPane === name;
    pane.classList.toggle("hidden", !selected);
    pane.classList.toggle("active", selected);
  });
  $("#appSearch").value = "";
  filterDrawerApps("");
  $("#appSearch").placeholder = name === "custom" ? "Search custom apps" : `Search ${name === "store" ? "web apps" : "apps"}`;
}

function filterDrawerApps(query) {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const activePane = document.querySelector("[data-drawer-pane].active");
  activePane?.querySelectorAll(".drawer-app-tile").forEach((tile) => {
    tile.classList.toggle("search-hidden", !tile.textContent.toLocaleLowerCase().includes(normalizedQuery));
  });
}

function showAppDrawer() {
  togglePowerMenu(false);
  renderDrawer();
  selectDrawerTab("installed");
  appDrawer.classList.remove("hidden");
  $("#allAppsButton").setAttribute("aria-expanded", "true");
  $("#appLauncherButton").setAttribute("aria-expanded", "true");
  $("#appSearch").focus();
}

function closeAppWindows() {
  appDrawer.classList.add("hidden");
  appWindow.classList.add("hidden");
  appWindowBody.replaceChildren();
  $("#allAppsButton").setAttribute("aria-expanded", "false");
  $("#appLauncherButton").setAttribute("aria-expanded", "false");
}

function showAppWindow(app, url = app.url) {
  const isLocalApp = app.kind === "explorer" || app.kind === "downloads";
  const appUrl = isLocalApp || !url ? "" : safeWebUrl(url);
  $("#appWindowTitle").textContent = app.name;
  $("#appWindowUrl").textContent = appUrl || "TharOS";
  $("#appWindowIcon").textContent = app.emoji || app.name.slice(0, 1);
  $("#openExternalApp").href = appUrl || "#";
  $("#openExternalApp").classList.toggle("hidden", !appUrl);
  appWindowBody.replaceChildren();
  appWindow.classList.remove("hidden");
  appDrawer.classList.add("hidden");
  $("#allAppsButton").setAttribute("aria-expanded", "false");
  $("#appLauncherButton").setAttribute("aria-expanded", "false");

  if (isLocalApp) {
    renderDownloads(app.kind === "explorer");
    return;
  }

  const frame = document.createElement("iframe");
  frame.className = "app-frame";
  frame.title = `${app.name} web app`;
  frame.referrerPolicy = "strict-origin-when-cross-origin";
  frame.src = appUrl;
  appWindowBody.append(frame);
}

function launchApp(app) {
  togglePowerMenu(false);
  if (app.desktopElement) {
    app = { ...app, url: app.desktopElement.href };
  }
  try {
    showAppWindow(app);
  } catch (error) {
    reportDrawerMessage(error.message, true);
  }
}

function renderDownloads(isExplorer) {
  const section = document.createElement("section");
  section.className = "file-view";
  const heading = document.createElement("div");
  heading.className = "file-view-heading";
  const title = document.createElement("h2");
  title.textContent = isExplorer ? "Recent files" : "Your downloads";
  const refreshButton = document.createElement("button");
  refreshButton.className = "drawer-action";
  refreshButton.type = "button";
  refreshButton.textContent = "Refresh";
  heading.append(title, refreshButton);
  const description = document.createElement("p");
  description.textContent = isExplorer
    ? "Files downloaded through this browser appear here."
    : "Recent files downloaded with this browser.";
  const list = document.createElement("div");
  list.className = "download-list";
  section.append(heading, description, list);
  appWindowBody.append(section);

  const load = async () => {
    list.replaceChildren();
    const loading = document.createElement("p");
    loading.className = "file-view-message";
    loading.textContent = "Loading downloads…";
    list.append(loading);
    try {
      const response = await extensionMessage({ action: "GET_DOWNLOADS" });
      if (!response?.success) throw new Error(response?.error || "Unable to load downloads.");
      list.replaceChildren();
      if (!response.downloads.length) {
        const empty = document.createElement("p");
        empty.className = "file-view-message";
        empty.textContent = "No browser downloads found.";
        list.append(empty);
        return;
      }
      response.downloads.forEach((download) => {
        const row = document.createElement("article");
        row.className = "download-row";
        const info = document.createElement("div");
        const name = document.createElement("strong");
        name.textContent = download.filename.split(/[\\/]/).pop() || download.filename;
        const detail = document.createElement("small");
        detail.textContent = download.state === "complete" ? "Downloaded" : download.state;
        info.append(name, detail);
        const open = document.createElement("button");
        open.type = "button";
        open.className = "drawer-action";
        open.textContent = "Open";
        open.disabled = download.state !== "complete";
        open.addEventListener("click", async () => {
          try {
            const result = await extensionMessage({ action: "OPEN_DOWNLOAD", downloadId: download.id });
            if (!result?.success) throw new Error(result?.error || "Unable to open this download.");
          } catch (error) {
            console.error("TharOS could not open the download:", error);
            detail.textContent = error.message;
          }
        });
        row.append(info, open);
        list.append(row);
      });
    } catch (error) {
      console.error("TharOS could not load downloads:", error);
      list.replaceChildren();
      const message = document.createElement("p");
      message.className = "file-view-message error";
      message.textContent = `${error.message} Make sure the TharOS extension has downloads permission.`;
      list.append(message);
    }
  };
  refreshButton.addEventListener("click", load);
  load();
}

function installApp(app) {
  const installedApps = readStoredApps(installedAppStorageKey);
  if (installedApps.some((installed) => installed.id === app.id)) return;
  try {
    writeAppList(installedAppStorageKey, [...installedApps, { ...app, storeApp: true }]);
    reportDrawerMessage(`${app.name} added to your app drawer.`);
    renderDrawer();
    selectDrawerTab("installed");
  } catch (error) {
    console.error("Unable to install app:", error);
    reportDrawerMessage("App could not be installed. Check browser storage settings.", true);
  }
}

function removeInstalledApp(id) {
  try {
    writeAppList(installedAppStorageKey, readStoredApps(installedAppStorageKey).filter((app) => app.id !== id));
    writeAppList(customAppStorageKey, readStoredApps(customAppStorageKey).filter((app) => app.id !== id));
    reportDrawerMessage("App removed from your drawer.");
    renderDrawer();
  } catch (error) {
    console.error("Unable to remove app:", error);
    reportDrawerMessage("App could not be removed. Check browser storage settings.", true);
  }
}

$("#allAppsButton").addEventListener("click", showAppDrawer);
$("#appLauncherButton").addEventListener("click", showAppDrawer);
$("#appSearch").addEventListener("input", (event) => filterDrawerApps(event.currentTarget.value));
document.querySelectorAll("[data-drawer-tab]").forEach((tab) => {
  tab.addEventListener("click", () => selectDrawerTab(tab.dataset.drawerTab));
});
$("#downloadsButton").addEventListener("click", () => showAppWindow(builtinApps[1]));
document.querySelectorAll("#desktop .app[href]").forEach((app) => {
  app.addEventListener("click", (event) => {
    event.preventDefault();
    launchApp({
      name: app.querySelector("span")?.textContent.trim() || app.title,
      url: app.href,
      emoji: app.querySelector(".app-icon")?.textContent.trim() || "◈"
    });
  });
});

$("#customAppForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const formData = new FormData(form);
  try {
    const name = String(formData.get("name")).trim();
    const url = safeWebUrl(String(formData.get("url")).trim());
    const iconValue = String(formData.get("icon")).trim();
    const iconUrl = iconValue ? safeWebUrl(iconValue) : "";
    if (!name) throw new Error("Enter an app name.");
    const customApps = readStoredApps(customAppStorageKey);
    const customApp = {
      id: `custom-${Date.now()}`,
      name,
      url,
      iconUrl,
      emoji: name.slice(0, 1).toUpperCase(),
      custom: true
    };
    writeAppList(customAppStorageKey, [...customApps, customApp]);
    form.reset();
    reportDrawerMessage(`${name} added to your app drawer.`);
    renderDrawer();
    selectDrawerTab("installed");
  } catch (error) {
    console.error("Unable to add custom app:", error);
    reportDrawerMessage(error.message || "App could not be added. Check browser storage settings.", true);
  }
});

document.querySelectorAll("[data-close-window]").forEach((button) => {
  button.addEventListener("click", closeAppWindows);
});

[appDrawer, appWindow].forEach((overlay) => {
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) closeAppWindows();
  });
});

// Request browser fullscreen when the new-tab desktop opens.
extensionMessage({ action: "FULLSCREEN" }).then((response) => {
  if (!response?.success) console.error("TharOS could not enter fullscreen.");
}).catch((error) => {
  console.error("TharOS fullscreen request failed:", error);
});


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
