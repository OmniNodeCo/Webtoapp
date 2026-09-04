// FUCKING FINALLY.
// Working solution to disable zoom keys.
// https://github.com/electron/electron/issues/8793#issuecomment-648307765
// Inject this to be rid of the curse.
window.onkeydown = function(evt) {
    // disable zooming
    if ((evt.code == "Minus" || evt.code == "Equal") && (evt.ctrlKey || evt.metaKey)) {evt.preventDefault()}
}
