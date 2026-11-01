function storeWindowPos() {
  window.localStorage.setItem('windowX', window.screenX);
  window.localStorage.setItem('windowY', window.screenY);
}
window.moveTo(window.localStorage.getItem('windowX'), window.localStorage.getItem('windowY'));
setInterval(storeWindowPos, 250);