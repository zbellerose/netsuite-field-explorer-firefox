// Function to check if the URL matches NetSuite
function isNetSuiteUrl(url) {
  return url.hostname.endsWith('.netsuite.com') && url.pathname.startsWith('/app/');
}

// Error logging function
function logError(error, context) {
  console.error(`[NetSuite Field Explorer] Error in ${context}:`, error);
}

// Handle messages from popup
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'FETCH_XML') {
    // Get the current active tab
    browser.tabs.query({ active: true, currentWindow: true })
      .then(tabs => {
        if (tabs.length === 0) {
          throw new Error('No active tab found');
        }
        const tab = tabs[0];
        
        // Execute content script in the tab
        return browser.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            return fetch(window.location.href + '&xml=T', {
              credentials: 'include',
              headers: {
                'Accept': 'application/xml'
              }
            })
            .then(response => response.text())
            .then(text => text);
          }
        });
      })
      .then(results => {
        const text = results[0].result;
        if (!text.includes('<?xml')) {
          throw new Error('Response is not XML format');
        }
        sendResponse({ success: true, data: text });
      })
      .catch(error => {
        logError(error, 'fetch XML');
        sendResponse({ success: false, error: error.message });
      });
    return true; // Will respond asynchronously
  }
});

// Update extension icon visibility based on URL
browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  try {
    if (changeInfo.url) {
      const url = new URL(changeInfo.url);
      if (isNetSuiteUrl(url)) {
        browser.action.enable(tabId).catch(error => logError(error, 'enable action'));
      } else {
        browser.action.disable(tabId).catch(error => logError(error, 'disable action'));
      }
    }
  } catch (error) {
    logError(error, 'tab update listener');
  }
});

// Handle initial tab state
browser.tabs.query({ active: true, currentWindow: true })
  .then((tabs) => {
    for (const tab of tabs) {
      try {
        if (tab.url) {
          const url = new URL(tab.url);
          if (isNetSuiteUrl(url)) {
            browser.action.enable(tab.id).catch(error => logError(error, 'initial enable action'));
          } else {
            browser.action.disable(tab.id).catch(error => logError(error, 'initial disable action'));
          }
        }
      } catch (error) {
        logError(error, 'initial tab state');
      }
    }
  })
  .catch(error => logError(error, 'tabs query'));
