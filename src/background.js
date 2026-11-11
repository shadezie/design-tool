/**
 * Design Tool - service worker.
 *
 * Owns the armed/idle state per tab. The content script is stateless about
 * activation: it does what this worker tells it to do.
 */

const CONTENT_FILES = [
  'src/ui/overlay-styles.js',
  'src/content/prefs.js',
  'src/content/target.js',
  'src/content/units.js',
  'src/content/tokens.js',
  'src/content/styles.js',
  'src/content/measure.js',
  'src/content/overlay.js',
  'src/content/stage.js',
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
  // Both reject when the tab is gone, which is exactly when a closed tab is
  // being cleaned up. Nothing to do about it and nothing lost.
  chrome.action.setBadgeText({ tabId, text: armed ? 'ON' : '' }).catch(() => {});
  chrome.action.setBadgeBackgroundColor({ tabId, color: '#4F8CFF' }).catch(() => {});
}

async function send(tabId, message) {
  return chrome.tabs.sendMessage(tabId, message);
}

/**
 * Ask the page whether the tool is on. The content script is the one that
 * knows: the stage loads the page into a frame, and a frame loading can look
 * like the tab navigating, so state kept here can drift from what is on
 * screen. A click that toggled on the drifted copy looked like a dead button.
 * @returns {Promise<string|null>} the content script's state, or null when
 *   there is no content script in the tab yet
 */
async function contentState(tabId) {
  try {
    const reply = await send(tabId, { type: 'designtool:ping' });
    return reply?.state || 'idle';
  } catch {
    return null;
  }
}

/**
 * Pages that were already open when the extension was installed or reloaded
 * have no content script. Inject it on demand rather than making the designer
 * reload the page they are trying to QA.
 */
async function inject(tabId) {
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

/**
 * Headers a site uses to say "never show me inside a frame".
 *
 * The stage frames the page inside itself, so a site that sends either of
 * these (X-Frame-Options: DENY, or a CSP with frame-ancestors 'none') would
 * leave the stage empty. A header can only be removed whole, which is why the
 * framed copy loses its Content-Security-Policy and not just the one
 * directive.
 */
const FRAMING_HEADERS = ['x-frame-options', 'content-security-policy'];

/**
 * Let the stage frame this tab's own site.
 *
 * As narrow as the API allows: this one tab, sub-frames only, requests to the
 * tab's own host only, and only until the tool is turned off. A session rule,
 * so it is gone when the browser closes even if the removal never runs.
 */
async function allowFraming(tab) {
  try {
    const { hostname, protocol } = new URL(tab.url || '');
    if (!/^https?:$/.test(protocol) || !hostname) return;
    await chrome.declarativeNetRequest.updateSessionRules({
      removeRuleIds: [tab.id],
      addRules: [
        {
          id: tab.id,
          priority: 1,
          action: {
            type: 'modifyHeaders',
            responseHeaders: FRAMING_HEADERS.map((header) => ({ header, operation: 'remove' })),
          },
          condition: {
            tabIds: [tab.id],
            resourceTypes: ['sub_frame'],
            requestDomains: [hostname],
          },
        },
      ],
    });
  } catch (err) {
    // Without the rule a site that forbids framing is inspected in place,
    // which is where it was before. Never a reason to fail the toggle.
    console.warn('[Design Tool] could not prepare the stage:', err.message);
  }
}

async function forbidFraming(tabId) {
  try {
    await chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: [tabId] });
  } catch {
    // No rule to remove, or the API is unavailable.
  }
}

async function setOff(tabId) {
  await setArmed(tabId, false);
  setBadge(tabId, false);
  await forbidFraming(tabId);
}

async function toggle(tab) {
  if (!tab || tab.id == null) return;
  const tabId = tab.id;

  let state = await contentState(tabId);
  if (state === null) {
    if (!(await inject(tabId))) return;
    state = 'idle';
  }
  const armed = state === 'idle';

  // The rule has to exist before the stage asks for its frame.
  if (armed) await allowFraming(tab);

  try {
    await send(tabId, { type: 'designtool:toggle', armed });
  } catch {
    // Frame went away between injection and message; drop the state.
    await setOff(tabId);
    return;
  }

  if (armed) {
    await setArmed(tabId, true);
    setBadge(tabId, true);
  } else {
    await setOff(tabId);
  }
}

chrome.action.onClicked.addListener(toggle);

// The content script turns itself off from its close button; follow it.
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === 'designtool:disarmed' && sender.tab?.id != null) {
    setOff(sender.tab.id);
  }
  // Always answer. A listener that returns without responding closes the port,
  // which rejects the sender's promise and logs in the inspected page.
  sendResponse({ ok: true });
  return false;
});

// When a tab we believe is on finishes loading something, ask it. A real
// navigation has thrown the content script away and gets no answer. The
// stage's own frame loading leaves it running, and nothing changes.
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
  if (changeInfo.status !== 'complete') return;
  const armed = await readArmed();
  if (!armed[tabId]) return;
  const state = await contentState(tabId);
  if (state === null || state === 'idle') await setOff(tabId);
});

// A closed tab has no badge left to clear: only our record and its rule.
chrome.tabs.onRemoved.addListener(async (tabId) => {
  await setArmed(tabId, false);
  await forbidFraming(tabId);
});
