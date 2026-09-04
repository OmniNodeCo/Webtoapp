(() => {
  const form = document.querySelector('#app-form');
  const feedback = document.querySelector('#feedback');
  const recentList = document.querySelector('#recent-list');
  const launch = document.querySelector('#launch');
  const storageKey = 'webtoapp.recent.v1';

  const read = () => ({
    name: document.querySelector('#name').value.trim(),
    url: document.querySelector('#url').value.trim(),
    width: Number(document.querySelector('#width').value),
    height: Number(document.querySelector('#height').value),
  });

  function setFeedback(message, type = '') {
    feedback.textContent = message;
    feedback.className = `feedback ${type}`;
  }

  function validate(request) {
    if (!request.name || request.name.length > 80) return 'Use an app name between 1 and 80 characters.';
    if (!Number.isInteger(request.width) || !Number.isInteger(request.height) || request.width < 320 || request.height < 320) return 'Use whole window dimensions of at least 320 pixels.';
    try {
      const url = new URL(request.url);
      const local = ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
      if (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) return 'Use HTTPS. HTTP is only allowed for localhost development.';
      if (url.username || url.password) return 'Do not include credentials in the website URL.';
    } catch { return 'Enter a complete website URL, including https://.'; }
    return '';
  }

  function recent() {
    try { return JSON.parse(localStorage.getItem(storageKey) || '[]'); } catch { return []; }
  }

  function saveRecent(item) {
    const items = [item, ...recent().filter((existing) => existing.url !== item.url)].slice(0, 5);
    localStorage.setItem(storageKey, JSON.stringify(items));
    renderRecent();
  }

  function renderRecent() {
    const items = recent();
    recentList.replaceChildren();
    if (!items.length) {
      const empty = document.createElement('p');
      empty.className = 'empty';
      empty.textContent = 'Your recent website apps will appear here.';
      recentList.append(empty);
      return;
    }
    for (const item of items) {
      const row = document.createElement('div');
      row.className = 'recent-item';
      const info = document.createElement('div');
      const title = document.createElement('strong');
      const url = document.createElement('small');
      title.textContent = item.name;
      url.textContent = item.url;
      info.append(title, url);
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = 'Open';
      button.addEventListener('click', () => open(item));
      row.append(info, button);
      recentList.append(row);
    }
  }

  async function open(request) {
    const error = validate(request);
    if (error) { setFeedback(error, 'error'); return; }
    if (!window.__TAURI__?.core) { setFeedback('The native Webtoapp bridge is unavailable.', 'error'); return; }
    launch.disabled = true;
    setFeedback('Opening your website app…');
    try {
      await window.__TAURI__.core.invoke('open_website_app', { request });
      saveRecent(request);
      setFeedback('Website app opened in a new native window.', 'success');
    } catch (reason) {
      setFeedback(typeof reason === 'string' ? reason : 'Could not open the website app.', 'error');
    } finally {
      launch.disabled = false;
    }
  }

  form.addEventListener('submit', (event) => { event.preventDefault(); void open(read()); });
  renderRecent();
})();
