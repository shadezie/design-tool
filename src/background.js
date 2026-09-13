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

/**
 * Which tabs are armed.
 *
 * This has to outlive the worker: MV3 evicts an idle service worker after about
 * 30 seconds, and an in-memory Map went with it. The next toolbar click then
 * thought the tab was idle, re-sent "arm" to an already-armed content script,
 * and looked like the button had stopped working. chrome.storage.session is
 * extension-only and cleared when the browser closes, which is exactly the
 * lifetime this state wants.
 */
const ARMED_KEY = 'armedTabs';

async function readArmed() {
  try {
    const stored = await chrome.storage.session.get(ARMED_KEY);
    return stored?.[ARMED_KEY] || {};
  } catch {
    return {};
  }
}

async function writeArmed(armed) {
  try {
    await chrome.storage.session.set({ [ARMED_KEY]: armed });
  } catch {
    // Session storage is unavailable; the badge still tells the user the truth.
  }
}

async function setArmed(tabId, value) {
  const armed = await readArmed();
  if (value) armed[tabId] = true;
  else delete armed[tabId];
  await writeArmed(armed);
}

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
  const current = await readArmed();
  const armed = !current[tabId];

  if (armed && !(await ensureInjected(tabId))) return;

  await setArmed(tabId, armed);
  setBadge(tabId, armed);
  try {
    await send(tabId, { type: 'designtool:toggle', armed });
  } catch {
    // Frame went away between injection and message; drop the state.
    await setArmed(tabId, false);
    setBadge(tabId, false);
  }
}

chrome.action.onClicked.addListener(toggle);

// The content script disarms itself on Esc; keep the worker's state in sync so
// the next toolbar click arms rather than toggling back off.
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === 'designtool:disarmed' && sender.tab?.id != null) {
    setArmed(sender.tab.id, false);
    setBadge(sender.tab.id, false);
  }
  // Always answer. A listener that returns without responding closes the port,
  // which rejects the sender's promise and logs in the inspected page.
  sendResponse({ ok: true });
  return false;
});

// A navigation tears down the content script's state; ours has to follow.
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
  if (changeInfo.status !== 'loading') return;
  const armed = await readArmed();
  if (!armed[tabId]) return;
  await setArmed(tabId, false);
  setBadge(tabId, false);
});

chrome.tabs.onRemoved.addListener((tabId) => setArmed(tabId, false));
