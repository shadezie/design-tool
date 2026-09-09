/**
 * Design Tool - service worker.
 *
 * Owns the armed/idle state per tab. The content script is stateless about
 * activation: it does what this worker tells it to do.
 */

const CONTENT_FILES = [
  'src/ui/overlay-styles.js',
  'src/content/prefs.js',
  'src/content/units.js',
  'src/content/styles.js',
  'src/content/measure.js',
  'src/content/overlay.js',
  'src/content/spacing-box.js',
  'src/content/card.js',
  'src/content/inspect.js',
  'src/content/index.js',
];

/** tabId -> armed */
const armedTabs = new Map();

function setBadge(tabId, armed) {
  chrome.action.setBadgeText({ tabId, text: armed ? 'ON' : '' });
  chrome.action.setBadgeBackgroundColor({ tabId, color: '#4F8CFF' });
}

async function send(tabId, message) {
  return chrome.tabs.sendMessage(tabId, message);
}

/**
 * Pages that were already open when the extension was installed or reloaded
 * have no content script. Inject it on demand rather than making the designer
 * reload the page they are trying to QA.
 */
async function ensureInjected(tabId) {
  try {
    await send(tabId, { type: 'designtool:ping' });
    return true;
  } catch {
    try {
      await chrome.scripting.executeScript({
        target: { tabId, allFrames: true },
        files: CONTENT_FILES,
      });
      return true;
    } catch (err) {
      console.warn('[Design Tool] cannot inject into this page:', err.message);
      return false;
    }
  }
}

async function toggle(tab) {
  if (!tab || tab.id == null) return;
  const tabId = tab.id;
  const armed = !armedTabs.get(tabId);

  if (armed && !(await ensureInjected(tabId))) return;

  armedTabs.set(tabId, armed);
  setBadge(tabId, armed);
  try {
    await send(tabId, { type: 'designtool:toggle', armed });
  } catch {
    // Frame went away between injection and message; drop the state.
    armedTabs.delete(tabId);
    setBadge(tabId, false);
  }
}

chrome.action.onClicked.addListener(toggle);

// The content script disarms itself on Esc; keep the worker's state in sync so
// the next toolbar click arms rather than toggling back off.
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg?.type === 'designtool:disarmed' && sender.tab?.id != null) {
    armedTabs.set(sender.tab.id, false);
    setBadge(sender.tab.id, false);
  }
});

// A navigation tears down the content script's state; ours has to follow.
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading' && armedTabs.get(tabId)) {
    armedTabs.set(tabId, false);
    setBadge(tabId, false);
  }
});

chrome.tabs.onRemoved.addListener((tabId) => armedTabs.delete(tabId));
