chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

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
    chrome.windows.getCurrent((currentWindow) => {
      if (!currentWindow.id) {
        sendResponse({ success: false });
        return;
      }

      chrome.windows.update(currentWindow.id, {
        state: "fullscreen"
      }, () => {
        sendResponse({
          success: !chrome.runtime.lastError
        });
      });
    });

    return true;
  }
});
