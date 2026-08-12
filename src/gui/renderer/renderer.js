(() => {
  const studio = window.studio;
  const $ = (selector) => document.querySelector(selector);
  const defaults = {
    appName: "My Website",
    appId: "com.webtoapp.my-website",
    website: "https://example.com",
    themeColor: "#6D5DFB",
    window: { width: 1280, height: 820, minWidth: 960, minHeight: 640 },
    behavior: { allowNavigation: [], openExternalLinks: true, showMenuBar: false },
  };
  let projectPath = "";
  let idTouched = false;
  let timer;

  function input(id) { return $("#" + id); }
  function number(id, fallback) { const value = Number(input(id).value); return Number.isFinite(value) ? value : fallback; }
  function value(id) { return input(id).value.trim(); }
  function currentConfig() {
    return {
      appName: value("appName"),
      appId: value("appId"),
      website: value("website"),
      themeColor: value("themeColor").toUpperCase(),
      window: {
        width: number("width", defaults.window.width),
        height: number("height", defaults.window.height),
        minWidth: number("minWidth", defaults.window.minWidth),
        minHeight: number("minHeight", defaults.window.minHeight),
      },
      behavior: {
        allowNavigation: value("allowedHosts").split(",").map((host) => host.trim()).filter(Boolean),
        openExternalLinks: input("openExternalLinks").checked,
        showMenuBar: input("showMenuBar").checked,
      },
    };
  }
  function applyConfig(config, preserveAppId = true) {
    const c = { ...defaults, ...config, window: { ...defaults.window, ...(config.window || {}) }, behavior: { ...defaults.behavior, ...(config.behavior || {}) } };
    input("appName").value = c.appName;
    input("appId").value = c.appId;
    input("website").value = c.website;
    input("themeColor").value = c.themeColor;
    input("themeColorPicker").value = /^#[0-9a-f]{6}$/i.test(c.themeColor) ? c.themeColor : defaults.themeColor;
    input("width").value = c.window.width;
    input("height").value = c.window.height;
    input("minWidth").value = c.window.minWidth;
    input("minHeight").value = c.window.minHeight;
    input("allowedHosts").value = c.behavior.allowNavigation.join(", ");
    input("openExternalLinks").checked = c.behavior.openExternalLinks;
    input("showMenuBar").checked = c.behavior.showMenuBar;
    idTouched = preserveAppId;
    refresh();
  }
  function deriveAppId(name) {
    const segment = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "website";
    return "com.webtoapp." + segment;
  }
  function hostFrom(url) {
    try { return new URL(url).hostname || "example.com"; } catch { return "example.com"; }
  }
  function updateProjectName() {
    const name = value("appName") || "Untitled app";
    $("#project-name").textContent = name;
    $("#crumb-name").textContent = name;
    $("#preview-title").textContent = name;
    $("#preview-host").textContent = hostFrom(value("website"));
    $("#preview-size").textContent = `${input("width").value || "—"} × ${input("height").value || "—"}`;
    $("#preview-color").style.backgroundColor = value("themeColor") || defaults.themeColor;
    $("#preview-button").style.backgroundColor = value("themeColor") || defaults.themeColor;
    $("#project-path").textContent = projectPath ? projectPath.split(/[\\/]/).pop() : "Not saved yet";
  }
  function toast(message, error = false) {
    const box = $("#toast");
    box.textContent = message;
    box.classList.toggle("error", error);
    box.classList.add("visible");
    window.clearTimeout(box.hideTimer);
    box.hideTimer = window.setTimeout(() => box.classList.remove("visible"), 4200);
  }
  function showValidation(issues) {
    const errors = issues.filter((item) => item.level === "error");
    const warnings = issues.filter((item) => item.level === "warning");
    const card = $("#validation-card");
    const readiness = $("#readiness");
    const title = card.querySelector("strong");
    const note = card.querySelector("p");
    card.classList.toggle("has-errors", errors.length > 0);
    if (errors.length) {
      title.innerHTML = `<span>!</span> ${errors.length} item${errors.length === 1 ? "" : "s"} to fix`;
      note.textContent = errors[0].message;
      readiness.querySelector("strong").textContent = "Needs attention";
      readiness.querySelector("small").textContent = "Fix details before exporting";
      readiness.querySelector(".readiness-ring").style.background = "conic-gradient(#d7465a 0deg 155deg,#f0e5e7 155deg)";
    } else if (warnings.length) {
      title.innerHTML = "<span>✓</span> Ready, with a note";
      note.textContent = warnings[0].message;
      readiness.querySelector("strong").textContent = "Ready to export";
      readiness.querySelector("small").textContent = "Review the security note";
      readiness.querySelector(".readiness-ring").style.background = "conic-gradient(#e5a93b 0deg 360deg,#f6f0e1 0deg)";
    } else {
      title.innerHTML = "<span>✓</span> Looking good";
      note.textContent = "Your configuration is ready to become an app.";
      readiness.querySelector("strong").textContent = "Ready to export";
      readiness.querySelector("small").textContent = "Complete the app details below";
      readiness.querySelector(".readiness-ring").style.background = "conic-gradient(#1dbb84 0deg 360deg,#e7f2ef 0deg)";
    }
    return errors.length === 0;
  }
  async function validate() {
    updateProjectName();
    try { return showValidation(await studio.validate(currentConfig())); }
    catch (error) { toast("Could not validate configuration.", true); return false; }
  }
  function refresh() {
    updateProjectName();
    clearTimeout(timer);
    timer = setTimeout(validate, 120);
  }
  async function save() {
    if (!(await validate())) { toast("Fix the highlighted configuration issue before saving.", true); return; }
    const result = await studio.saveConfig(currentConfig(), projectPath || undefined);
    if (result.error) { toast(result.error.message, true); return; }
    if (!result.canceled) { projectPath = result.path; updateProjectName(); toast("Configuration saved."); }
  }
  async function open() {
    const result = await studio.openConfig();
    if (result.error) { toast(result.error.message, true); return; }
    if (!result.canceled) { projectPath = result.path; applyConfig(result.config); toast("Configuration opened."); }
  }
  async function exportProject() {
    if (!(await validate())) { toast("Fix the configuration before exporting.", true); return; }
    const destination = await studio.chooseOutput();
    if (destination.canceled) return;
    const button = $("#build-button");
    button.disabled = true;
    button.textContent = "Exporting…";
    const result = await studio.build(currentConfig(), destination.path);
    button.disabled = false;
    button.innerHTML = "<span>✦</span> Export app";
    if (result.error) { toast(result.error.message, true); return; }
    if (!result.canceled) toast(`App project exported to ${result.result.outputDirectory}`);
  }
  document.addEventListener("DOMContentLoaded", async () => {
    applyConfig(defaults, false);
    $("#project-form").addEventListener("input", (event) => {
      if (event.target.id === "appId") idTouched = true;
      if (event.target.id === "appName" && !idTouched) input("appId").value = deriveAppId(event.target.value);
      if (event.target.id === "themeColor" && /^#[0-9a-f]{6}$/i.test(event.target.value.trim())) input("themeColorPicker").value = event.target.value.trim();
      refresh();
    });
    $("#project-form").addEventListener("change", refresh);
    input("themeColorPicker").addEventListener("input", (event) => { input("themeColor").value = event.target.value.toUpperCase(); refresh(); });
    $("#open-button").addEventListener("click", open);
    $("#save-button").addEventListener("click", save);
    $("#build-button").addEventListener("click", exportProject);
    $("#export-button").addEventListener("click", exportProject);
    document.querySelectorAll("[data-external]").forEach((link) => link.addEventListener("click", (event) => { event.preventDefault(); studio.openExternal(link.href); }));
    try { $("#version").textContent = "Version " + await studio.version(); } catch { $("#version").textContent = "Desktop Studio"; }
  });
})();
