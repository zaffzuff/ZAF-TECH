/** ES5, storage-free recovery before React/SDK: never record exception details. */
export const startupGuardScript = `(function () {
  // Only the observatory emits its readiness event; policy/callback routes do not.
  if (window.location.pathname !== '/') return;
  var code = '', timer;
  function show() {
    if (document.documentElement.getAttribute('data-zaf-ready') === 'true') return;
    var panel = document.getElementById('zaf-startup-help');
    if (!panel) return;
    panel.hidden = false;
    document.getElementById('zaf-startup-code').textContent = code;
    document.getElementById('zaf-startup-retry').href = '/?zaf_retry=' + Date.now();
  }
  function failed(event) {
    var target = event && event.target;
    if (target && target.tagName && target.tagName !== 'SCRIPT') return;
    // SDK failures belong to the sign-in UI, not the observatory boot path.
    if (target && target.src && target.src.indexOf('/_next/') < 0) return;
    code = target && target.tagName === 'SCRIPT' ? 'ZAF-BOOT-SCRIPT' : 'ZAF-BOOT-RUNTIME';
    show();
  }
  window.addEventListener('error', failed, true);
  document.addEventListener('DOMContentLoaded', function () { if (code) show(); });
  timer = window.setTimeout(function () { code = code || 'ZAF-BOOT-TIMEOUT'; show(); }, 15000);
  window.addEventListener('zaf-app-ready', function () {
    window.clearTimeout(timer);
    var panel = document.getElementById('zaf-startup-help');
    if (panel) panel.hidden = true;
  });
})();`;

export function markAppReady() {
  document.documentElement.setAttribute("data-zaf-ready", "true");
  window.dispatchEvent(new Event("zaf-app-ready"));
}
