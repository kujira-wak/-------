const defaultConfig = {
  enableCmdLogs: true,
  featureToggles: {
    cmdLogs: true,
    status: true,
    diagnostics: true,
    jokes: true,
    loadingBars: true,
    modules: true,
  },
  fortunes: [
    "いいことがあるかもしれないよ",
    "そろそろもう寝よう",
    "今から最初に会った人に挨拶しよう",
    "魔法が使える気分で作業してみよう",
    "インターネットをやめて河川敷で走ろう",
    "オムライスを食べよう",
    "脳内で家の周りの地図を作ろう",
    "レモンソーダを飲もう",
    "遠回りをしてみよう",
    "3分だけ休憩しよう",
    "流行の音楽を聴こう",
    "ファンタジー小説を読んでみよう",
    "海に行こう",
    "山に行こう",
  ],
  cmdModules: ["omikuji.dll", "luck32.sys", "teaLeaves.dat", "star-chart.cfg", "weather-sync.bin", "mood.board", "future-core.lib"],
  cmdStatusMessages: [
    "STATUS: {user} の運勢データをインデックス化中...",
    "SCAN: {user} のオーラファイルをスキャンしています...",
    "SYNC: 干支テーブルを同期中...",
    "CACHE: 先祖ログを温めています...",
    "INFO: GPT-占いモードを起動中...",
    "CHECK: モチベーション残量を計測中...",
    "ANALYZE: 猫の気分を参照中...",
    "FETCH: メロンソーダの在庫APIを叩いています...",
  ],
  cmdDiagMessages: [
    "DIAG: 乱数エンジンが97%健康です。",
    "DIAG: ネガティブ思考フィルター稼働中。",
    "NOTICE: 睡眠不足フラグをfalseに補正。",
    "INFO: 未来バッファをデフラグ中...",
    "MEMO: 占いサーバーが珍しく機嫌良さそうです。",
    "WARN: コーヒー濃度が想定より高めです。",
  ],
  cmdJokes: [
    "LOG: カレーうどんの汁で未来を占うのは非推奨です。",
    "ヒント: Ctrl+C で運命をキャンセルしても現実は続きます。",
    "ジョーク: fortune.exe はいまだにフロッピーから起動していません。",
    "NOTE: ランダム種に猫の鳴き声を混入中...",
    "LOG: Windows Update を装う冗談。再起動は要求しません。",
    "MEMO: あなたのやる気はサーバールームの気温に依存している説。",
  ],
  loadingLabels: ["entropy", "sync", "luck", "oracle", "cache", "signal"],
};

let unsei = [...defaultConfig.fortunes];

let button = document.getElementById("uranai");
let nameInput = document.getElementById("namae");
let inputRow = document.querySelector(".inputbox");
let hint = document.querySelector(".chui");
let output = document.getElementById("kekka");
let promptLine = document.querySelector(".prompt-line");
let barTitle = document.querySelector(".bar-title");
let themeSelect = document.getElementById("themeDebugSelect");
let osDebugSelect = document.getElementById("osDebugSelect");
let typedTextDisplay = document.querySelector(".cmd-typed-text");
let osSuggestion = document.querySelector(".os-suggestion");
let logWindow = document.getElementById("logWindow");
let terminalShell = document.querySelector(".terminal-shell");
let accessPanel = document.getElementById("accessBlockPanel");
let accessPanelPc = document.getElementById("accessPanelPc");
let accessPanelMobile = document.getElementById("accessPanelMobile");
let accessPanelOther = document.getElementById("accessPanelOther");
let againControls = document.getElementById("againControls");
const accessPanelMap = {
  "pc-os": accessPanelPc,
  mobile: accessPanelMobile,
  "other-device": accessPanelOther,
};

const DEFAULT_PROMPT_TEXT = promptLine ? promptLine.textContent : "";
const DEFAULT_BAR_TITLE = barTitle ? barTitle.textContent : "";
const DEFAULT_HINT_TEXT = hint ? hint.textContent : "";
const DEBUG_THEME_KEY = "omikujiThemeMode";
const OS_DEBUG_KEY = "omikujiOsDebugMode";
let cmdBuffer = "";
const detectedOS = detectOS();
let activeOS = detectedOS;
let cmdTimers = [];
let cmdJokes = [...defaultConfig.cmdJokes];
let cmdModules = [...defaultConfig.cmdModules];
let cmdStatusMessages = [...defaultConfig.cmdStatusMessages];
let cmdDiagMessages = [...defaultConfig.cmdDiagMessages];
let loadingLabels = [...defaultConfig.loadingLabels];
let featureToggles = { ...defaultConfig.featureToggles };
let enableCmdLogs = featureToggles.cmdLogs !== false && defaultConfig.enableCmdLogs !== false;
let usageAllowed = false;
let currentThemePreference = "auto";
let viewportOverrideOs = null;

function toggleAgainControls(show) {
  if (!againControls) {
    return;
  }
  againControls.classList.toggle("kakusu", !show);
}

function triggerTerminalFlash(element) {
  if (!element) {
    return;
  }
  element.classList.remove("line-flash");
  void element.offsetWidth;
  element.classList.add("line-flash");
}

function clearCmdTimers() {
  cmdTimers.forEach((id) => window.clearTimeout(id));
  cmdTimers = [];
}

function clearLogWindow() {
  if (!logWindow) {
    return;
  }
  logWindow.innerHTML = "";
}

function appendLogLine(text, classes = []) {
  if (!logWindow) {
    return;
  }
  let line = document.createElement("div");
  line.classList.add("log-line");
  classes.forEach((cls) => line.classList.add(cls));
  line.textContent = text;
  logWindow.appendChild(line);
  logWindow.scrollTop = logWindow.scrollHeight;
}

function pickRandom(array) {
  if (!array.length) {
    return "";
  }
  let index = Math.floor(Math.random() * array.length);
  return array[index];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function createLoadingBar(percent, label = "") {
  let totalBlocks = 20;
  let filledBlocks = Math.max(0, Math.min(totalBlocks, Math.round((percent / 100) * totalBlocks)));
  let bar = `[${"#".repeat(filledBlocks)}${".".repeat(totalBlocks - filledBlocks)}] ${percent}%`;
  if (label) {
    bar += ` ${label}`;
  }
  return bar;
}

function applyConfigOverrides(data) {
  if (!data || typeof data !== "object") {
    return;
  }
  if (Array.isArray(data.fortunes) && data.fortunes.length) {
    unsei = data.fortunes.slice();
  }
  if (Array.isArray(data.cmdModules) && data.cmdModules.length) {
    cmdModules = data.cmdModules.slice();
  }
  if (Array.isArray(data.cmdStatusMessages) && data.cmdStatusMessages.length) {
    cmdStatusMessages = data.cmdStatusMessages.slice();
  }
  if (Array.isArray(data.cmdDiagMessages) && data.cmdDiagMessages.length) {
    cmdDiagMessages = data.cmdDiagMessages.slice();
  }
  if (Array.isArray(data.cmdJokes) && data.cmdJokes.length) {
    cmdJokes = data.cmdJokes.slice();
  }
  if (Array.isArray(data.loadingLabels) && data.loadingLabels.length) {
    loadingLabels = data.loadingLabels.slice();
  }
  if (typeof data.enableCmdLogs === "boolean") {
    enableCmdLogs = data.enableCmdLogs;
    featureToggles.cmdLogs = data.enableCmdLogs;
  }
  if (data.featureToggles && typeof data.featureToggles === "object") {
    Object.keys(featureToggles).forEach((key) => {
      if (typeof data.featureToggles[key] === "boolean") {
        featureToggles[key] = data.featureToggles[key];
      }
    });
  }
  enableCmdLogs = featureToggles.cmdLogs !== false;
}

function loadExternalConfig() {
  fetch("config.json")
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Config load failed: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      applyConfigOverrides(data);
    })
    .catch((error) => {
      console.warn("Config override skipped", error);
    });
}

function buildCmdSequence(userName, fortuneMessage) {
  let safeName = userName || "anonymous";
  let promptUser = safeName.replace(/[\\/:*?"<>|]/g, "_") || "You";
  let sequence = [];
  let progress = 0;

  function advanceProgress(minStep = 7, maxStep = 18) {
    progress = Math.min(100, progress + randomInt(minStep, maxStep));
    return progress;
  }

  function pushProgress(label) {
    let percent = advanceProgress();
    if (featureToggles.loadingBars === false) {
      return percent;
    }
    let chosenLabel = label || pickRandom(loadingLabels) || "LOAD";
    sequence.push({
      text: createLoadingBar(percent, chosenLabel.toUpperCase()),
      classes: ["loading", "bar"],
      delay: randomInt(160, 300),
    });
    return percent;
  }

  sequence.push({ text: `C:\\Users\\${promptUser}> fortune.exe /target ${safeName}`, classes: ["command"], delay: 0 });
  let moduleLine = "LOAD: fortune-core.lib を初期化中...";
  if (featureToggles.modules !== false && cmdModules.length) {
    moduleLine = `LOAD: ${pickRandom(cmdModules)} を初期化中...`;
  }
  sequence.push({ text: moduleLine, classes: ["loading"], delay: 240 });
  pushProgress("BOOT");

  let statusIterations = featureToggles.status === false ? 0 : randomInt(4, 6);
  for (let i = 0; i < statusIterations; i++) {
    let statusTemplate = pickRandom(cmdStatusMessages) || "STATUS: {user} を解析中...";
    let status = statusTemplate.replace("{user}", safeName);
    sequence.push({ text: status, classes: ["loading"], delay: randomInt(220, 420) });

    if (featureToggles.loadingBars !== false && Math.random() < 0.85) {
      pushProgress();
    } else {
      advanceProgress();
    }
    if (featureToggles.diagnostics !== false && Math.random() < 0.5) {
      sequence.push({
        text: pickRandom(cmdDiagMessages) || "DIAG: ok",
        classes: ["loading"],
        delay: randomInt(200, 360),
      });
    }
  }

  if (featureToggles.loadingBars !== false && progress < 85) {
    while (progress < 90) {
      pushProgress();
    }
  } else {
    progress = Math.max(progress, 90);
  }

  if (featureToggles.loadingBars !== false) {
    if (Math.random() < 0.5) {
      let finalPercent = 100;
      progress = finalPercent;
      sequence.push({
        text: createLoadingBar(finalPercent, "DONE"),
        classes: ["loading", "bar"],
        delay: randomInt(200, 320),
      });
    } else {
      while (progress < 100) {
        let remaining = 100 - progress;
        advanceProgress(Math.min(remaining, 5), remaining);
        sequence.push({
          text: createLoadingBar(progress, "FINAL"),
          classes: ["loading", "bar"],
          delay: randomInt(180, 260),
        });
      }
    }
  } else {
    progress = 100;
  }

  if (featureToggles.jokes !== false) {
    let jokeCount = randomInt(1, 2);
    for (let j = 0; j < jokeCount; j++) {
      if (Math.random() < 0.7) {
        sequence.push({ text: pickRandom(cmdJokes), classes: ["joke"], delay: randomInt(220, 380) });
      }
    }
  }

  sequence.push({
    text: `RESULT: ${fortuneMessage}`,
    classes: ["result"],
    delay: 480,
    isResult: true,
  });
  sequence.push({ text: `C:\\Users\\${promptUser}>`, classes: ["command"], delay: 420 });
  return sequence;
}

function playCmdSequence(userName, fortuneMessage) {
  clearCmdTimers();
  clearLogWindow();
  let steps = buildCmdSequence(userName, fortuneMessage);
  let elapsed = 0;
  steps.forEach((step) => {
    elapsed += step.delay || 0;
    let timerId = window.setTimeout(() => {
      appendLogLine(step.text, step.classes || []);
      if (step.isResult && output) {
        triggerTerminalFlash(output);
      }
    }, elapsed);
    cmdTimers.push(timerId);
  });
}

function renderStandardFortune(message) {
  clearCmdTimers();
  if (!logWindow) {
    return;
  }
  logWindow.innerHTML = "";
  appendLogLine(message);
}

function isCmdModeActive() {
  if (typeof document === "undefined") {
    return false;
  }
  return document.body.classList.contains("cmd-mode");
}

function detectOS() {
  if (typeof navigator === "undefined") {
    return "other";
  }
  let ua = navigator.userAgent || "";
  if (/windows/i.test(ua)) {
    return "windows";
  }
  if (/macintosh|mac os/i.test(ua)) {
    return "mac";
  }
  if (/android/i.test(ua)) {
    return "android";
  }
  if (/iphone|ipad|ipod/i.test(ua)) {
    return "ios";
  }
  if (/linux/i.test(ua)) {
    return "linux";
  }
  return "other";
}

function isAllowedOS(os) {
  return os === "windows" || os === "mac";
}

function getAccessContext(os) {
  if (os === "windows" || os === "mac") {
    return "allowed";
  }
  if (os === "linux") {
    return "pc-os";
  }
  if (os === "android" || os === "ios") {
    return "mobile";
  }
  return "other-device";
}

function detectViewportOverrideOs() {
  if (typeof window === "undefined") {
    return null;
  }
  let narrowMatch = false;
  let coarseMatch = false;
  if (window.matchMedia) {
    narrowMatch = window.matchMedia("(max-width: 540px)").matches;
    coarseMatch = window.matchMedia("(pointer: coarse)").matches;
  } else {
    narrowMatch = window.innerWidth <= 540;
  }
  let touchPoints = typeof navigator !== "undefined" ? navigator.maxTouchPoints || 0 : 0;
  if (narrowMatch && (coarseMatch || touchPoints > 1)) {
    return "ios";
  }
  return null;
}

function setupViewportWatchers() {
  if (typeof window === "undefined") {
    return;
  }
  let handler = () => {
    let next = detectViewportOverrideOs();
    if (next !== viewportOverrideOs) {
      viewportOverrideOs = next;
      if (!osDebugSelect || osDebugSelect.value === "auto") {
        setActiveOSFromMode("auto");
      }
    }
  };
  window.addEventListener("resize", handler);
  window.addEventListener("orientationchange", handler);
  if (window.matchMedia) {
    let coarseQuery = window.matchMedia("(pointer: coarse)");
    if (typeof coarseQuery.addEventListener === "function") {
      coarseQuery.addEventListener("change", handler);
    } else if (typeof coarseQuery.addListener === "function") {
      coarseQuery.addListener(handler);
    }
  }
}

function resolveOsOverride(mode) {
  if (!mode || mode === "auto") {
    return viewportOverrideOs || detectedOS;
  }
  return mode;
}

function applyActiveOS(os) {
  activeOS = os;
  let context = getAccessContext(os);
  applyOsMessaging(activeOS, context);
  updateUsageAvailability(activeOS, context);
  updateAccessRestrictionView(activeOS, context);
  if (currentThemePreference === "auto") {
    applyThemeMode("auto", { skipPreferenceUpdate: true });
  }
}

function setActiveOSFromMode(mode) {
  let resolved = resolveOsOverride(mode);
  applyActiveOS(resolved);
}

function updateUsageAvailability(os, context = getAccessContext(os)) {
  usageAllowed = context === "allowed";
  if (button) {
    button.disabled = !usageAllowed;
    if (!usageAllowed) {
      button.value = "利用不可";
    } else {
      button.value = "引く";
    }
  }
  if (nameInput) {
    nameInput.disabled = !usageAllowed;
    if (!usageAllowed) {
      nameInput.placeholder = "対応OS(Windows/Mac)から利用してください";
    } else {
      nameInput.placeholder = "名前を記入";
    }
  }
}

function updateAccessRestrictionView(os, context = getAccessContext(os)) {
  if (!terminalShell || !accessPanel) {
    return;
  }
  let normalizedContext = context;
  if (!accessPanelMap[normalizedContext] && normalizedContext !== "allowed") {
    normalizedContext = "other-device";
  }
  let shouldBlock = normalizedContext !== "allowed";
  terminalShell.classList.toggle("access-locked", shouldBlock);
  let panels = Object.values(accessPanelMap);
  if (!shouldBlock) {
    accessPanel.classList.add("kakusu");
    accessPanel.removeAttribute("data-context");
    panels.forEach((panel) => panel && panel.classList.add("kakusu"));
    toggleAgainControls(false);
    return;
  }
  accessPanel.classList.remove("kakusu");
  accessPanel.dataset.context = normalizedContext;
  clearCmdTimers();
  clearLogWindow();
  toggleAgainControls(false);
  panels.forEach((panel) => {
    if (!panel) {
      return;
    }
    let key = panel.dataset.contextKey;
    panel.classList.toggle("kakusu", key !== normalizedContext);
  });
}

function isOmikujiAllowed() {
  return usageAllowed;
}

function applyOsMessaging(os, context = getAccessContext(os)) {
  if (!osSuggestion) {
    return;
  }
  let advice = "";
  if (os === "windows") {
    advice = "Windows 端末です。Enter または Fortune コマンドで即実行できます。";
  } else if (os === "mac") {
    advice = "macOS からのアクセスですね。Enter キーで fortune を実行できます。";
  } else {
    let labelMap = {
      linux: "Windows / macOS 以外の PC",
      android: "Android",
      ios: "iOS",
      other: "その他デバイス",
    };
    if (context === "pc-os") {
      advice = `${labelMap.linux} を検出しました。Windows または macOS のライセンスを購入して CMD ログを解放してください。`;
    } else if (context === "mobile") {
      let label = os === "android" ? labelMap.android : labelMap.ios;
      advice = `${label} 端末では占いを実行できません。PC を購入し、Windows か macOS での体験にアップグレードしてください。`;
    } else {
      advice = `${labelMap.other} からのアクセスです。対応 OS を搭載した PC の購入をご検討ください。`;
    }
  }
  if (context !== "allowed") {
    advice += advice ? " " : "";
    advice += "現在は Windows か macOS からのみご利用いただけます。";
  }
  osSuggestion.textContent = advice;
}

function updateCmdTypedDisplay() {
  if (typedTextDisplay) {
    typedTextDisplay.textContent = cmdBuffer;
  }
  if (isCmdModeActive() && nameInput) {
    nameInput.value = cmdBuffer;
  }
}

function resetCmdBuffer() {
  cmdBuffer = "";
  updateCmdTypedDisplay();
}

function applyCmdTheme() {
  if (typeof document === "undefined") {
    return;
  }
  document.body.classList.add("cmd-mode");
  if (barTitle) {
    barTitle.textContent = "Command Prompt";
  }
  if (promptLine) {
    promptLine.textContent = "C:\\Users\\You> fortune.exe";
  }
  if (hint) {
    hint.textContent = "※ Enter キーで fortune.exe を実行";
  }
  clearCmdTimers();
  clearLogWindow();
  resetCmdBuffer();
}

function removeCmdTheme() {
  if (typeof document === "undefined") {
    return;
  }
  document.body.classList.remove("cmd-mode");
  if (barTitle) {
    barTitle.textContent = DEFAULT_BAR_TITLE;
  }
  if (promptLine) {
    promptLine.textContent = DEFAULT_PROMPT_TEXT;
  }
  if (hint) {
    hint.textContent = DEFAULT_HINT_TEXT;
  }
  clearCmdTimers();
  resetCmdBuffer();
}

function resolveTheme(mode) {
  if (mode === "auto") {
    return activeOS === "windows" ? "cmd" : "terminal";
  }
  return mode;
}

function applyThemeMode(mode, options = {}) {
  if (!options.skipPreferenceUpdate) {
    currentThemePreference = mode;
  }
  let resolved = resolveTheme(mode);
  if (resolved === "cmd") {
    applyCmdTheme();
  } else {
    removeCmdTheme();
  }
  if (!options.skipPreferenceUpdate && themeSelect && themeSelect.value !== mode) {
    themeSelect.value = mode;
  }
  updateCmdTypedDisplay();
}

function setupDebugToggle() {
  if (!themeSelect) {
    return;
  }
  themeSelect.addEventListener("change", (event) => {
    let value = event.target.value;
    try {
      window.localStorage.setItem(DEBUG_THEME_KEY, value);
    } catch (error) {
      console.warn("Unable to persist theme preference", error);
    }
    applyThemeMode(value);
  });
}

function setupOsDebugToggle() {
  if (!osDebugSelect) {
    return;
  }
  osDebugSelect.addEventListener("change", (event) => {
    let value = event.target.value;
    try {
      window.localStorage.setItem(OS_DEBUG_KEY, value);
    } catch (error) {
      console.warn("Unable to persist OS override", error);
    }
    setActiveOSFromMode(value);
  });
}

function setup() {
  if (!button) {
    return;
  }
  button.addEventListener("click", omikujibako);
}

function shouldIgnoreCmdKey(event) {
  let target = event.target;
  if (!target) {
    return false;
  }
  if (target.closest && target.closest(".debug-toggle")) {
    return true;
  }
  let tagName = target.tagName || "";
  if (tagName === "INPUT" || tagName === "SELECT" || target.isContentEditable) {
    return target !== nameInput;
  }
  return false;
}

function commitCmdCommand() {
  if (!isOmikujiAllowed()) {
    return;
  }
  if (nameInput) {
    nameInput.value = cmdBuffer;
  }
  omikujibako();
  resetCmdBuffer();
}

function handleCmdKeydown(event) {
  if (!isOmikujiAllowed()) {
    return;
  }
  if (!isCmdModeActive()) {
    return;
  }
  if (event.ctrlKey || event.metaKey || event.altKey) {
    return;
  }
  if (shouldIgnoreCmdKey(event)) {
    return;
  }
  if (event.key === "Enter") {
    event.preventDefault();
    commitCmdCommand();
    return;
  }
  if (event.key === "Backspace") {
    event.preventDefault();
    cmdBuffer = cmdBuffer.slice(0, -1);
    updateCmdTypedDisplay();
    return;
  }
  if (event.key === "Escape") {
    event.preventDefault();
    resetCmdBuffer();
    return;
  }
  if (event.key.length === 1) {
    event.preventDefault();
    cmdBuffer += event.key;
    updateCmdTypedDisplay();
  }
}

function omikujibako() {
  if (!isOmikujiAllowed()) {
    return;
  }
  clearCmdTimers();
  let random = Math.floor(Math.random() * unsei.length);
  let yarukoto = unsei[random];
  let name = "";
  if (nameInput) {
    name = nameInput.value.trim();
  }

  let message = "";
  if (name) {
    message = `${name}さん、今日は「${yarukoto}」がしっくり来そうだよ。`;
  } else {
    message = `今日は「${yarukoto}」がぽんっとおすすめに出てきたよ。`;
  }

  if (output) {
    output.classList.remove("kakusu");
    output.classList.add("revealed");
  }

  if (isCmdModeActive() && enableCmdLogs) {
    playCmdSequence(name, message);
  } else {
    renderStandardFortune(message);
    triggerTerminalFlash(output);
  }

  if (inputRow && !isCmdModeActive()) {
    inputRow.style.display = "none";
  }
  if (hint && !isCmdModeActive()) {
    hint.style.display = "none";
  }
  toggleAgainControls(true);
}

let storedMode = "auto";
try {
  storedMode = window.localStorage.getItem(DEBUG_THEME_KEY) || "auto";
} catch (error) {
  storedMode = "auto";
}

let storedOsMode = "auto";
try {
  storedOsMode = window.localStorage.getItem(OS_DEBUG_KEY) || "auto";
} catch (error) {
  storedOsMode = "auto";
}

if (osDebugSelect) {
  osDebugSelect.value = storedOsMode;
}

viewportOverrideOs = detectViewportOverrideOs();
setActiveOSFromMode(storedOsMode);

loadExternalConfig();
applyThemeMode(storedMode);
document.addEventListener("keydown", handleCmdKeydown);
setupDebugToggle();
setupOsDebugToggle();
setupViewportWatchers();
window.onload = setup;
