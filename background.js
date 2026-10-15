chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  if (message.action === "GET_DOWNLOADS") {
    if (!chrome.downloads) {
      sendResponse({ success: false, error: "The browser downloads API is unavailable." });
      return;
    }

    chrome.downloads.search({ orderBy: ["-startTime"], limit: 100 }, (items) => {
      const error = chrome.runtime.lastError;
      if (error) {
        sendResponse({ success: false, error: error.message });
        return;
      }

      sendResponse({
        success: true,
        downloads: items.map((item) => ({
          id: item.id,
          filename: item.filename,
          state: item.state,
          startTime: item.startTime,
          totalBytes: item.totalBytes
        }))
      });
    });
    return true;
  }

  if (message.action === "OPEN_DOWNLOAD") {
    try {
      chrome.downloads.open(message.downloadId);
      sendResponse({ success: true });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
    return;
  }

  // OPEN DOWNLOADS
  if (message.action === "OPEN_DOWNLOADS") {
    const downloadsUrl = "about:downloads";

    chrome.tabs.create({
      url: downloadsUrl
    });

    sendResponse({ success: true });
  }
  // SHUTDOWN
  if (message.action === "SHUTDOWN") {
    chrome.tabs.query(
      { currentWindow: true },
      (tabs) => {
        const tabIds = tabs
          .filter(tab => tab.id !== undefined)
          .map(tab => tab.id);

        chrome.tabs.remove(tabIds, () => {
          sendResponse({
            success: !chrome.runtime.lastError
          });
        });
      }
    );

    return true;
  }

  // FULLSCREEN
  if (message.action === "FULLSCREEN") {
    const updateFullscreen = (windowId) => {
      if (!windowId) {
        sendResponse({ success: false });
        return;
      }

      chrome.windows.update(windowId, {
        state: "fullscreen"
      }, () => {
        sendResponse({
          success: !chrome.runtime.lastError
        });
      });
    };

    if (sender.tab?.windowId) {
      updateFullscreen(sender.tab.windowId);
    } else {
      chrome.windows.getLastFocused((currentWindow) => updateFullscreen(currentWindow.id));
    }

    return true;
  }
});
