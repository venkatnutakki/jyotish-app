// Electron main process — launches the Next.js standalone server locally and
// shows it in a desktop window. Everything runs offline; the only network use
// is the optional AI reading (Anthropic), which reads a key from the app's
// config file so it can be changed without rebuilding.

const { app, BrowserWindow, Menu, dialog, shell, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const net = require("net");
const http = require("http");
const { spawn } = require("child_process");

const isDev = !app.isPackaged;

// Store app data in Local AppData (never OneDrive-synced) and make sure the
// folder exists before anything touches it — this avoids the Windows
// "Location is not available" error on first run.
try {
  const base = process.env.LOCALAPPDATA || app.getPath("appData");
  const userDir = path.join(base, "Jyotish");
  fs.mkdirSync(userDir, { recursive: true });
  app.setPath("userData", userDir);
} catch (e) {
  console.error("userData setup failed", e);
}

// Where the standalone Next server lives.
function standaloneDir() {
  return isDev
    ? path.join(__dirname, "..", ".next", "standalone")
    : path.join(process.resourcesPath, "standalone");
}

// Read a user-editable config (e.g. the Anthropic key) from userData.
function loadConfig() {
  try {
    const p = path.join(app.getPath("userData"), "config.json");
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {}
  return {};
}

function configPath() {
  return path.join(app.getPath("userData"), "config.json");
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const port = srv.address().port;
      srv.close(() => resolve(port));
    });
  });
}

function waitForServer(port, timeoutMs = 30000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      const req = http.get(
        { host: "127.0.0.1", port, path: "/", timeout: 1500 },
        (res) => {
          res.destroy();
          resolve();
        }
      );
      req.on("error", () => {
        if (Date.now() - start > timeoutMs) reject(new Error("Server did not start"));
        else setTimeout(tick, 300);
      });
      req.on("timeout", () => req.destroy());
    };
    tick();
  });
}

let serverProcess = null;

async function startServer() {
  const port = await getFreePort();
  const dir = standaloneDir();
  const serverJs = path.join(dir, "server.js");
  const cfg = loadConfig();

  const env = {
    ...process.env,
    NODE_ENV: "production",
    PORT: String(port),
    HOSTNAME: "127.0.0.1",
    // The server reads this config live, so a key set in-app works immediately.
    JYOTISH_CONFIG: configPath(),
  };
  // AI key: config file wins, else any existing env var.
  const key = cfg.anthropicApiKey || cfg.aiApiKey || process.env.ANTHROPIC_API_KEY;
  if (key) env.ANTHROPIC_API_KEY = key;
  if (cfg.aiProvider) env.AI_PROVIDER = cfg.aiProvider;

  // Run server.js under Electron's bundled Node.
  serverProcess = spawn(process.execPath, [serverJs], {
    cwd: dir,
    env: { ...env, ELECTRON_RUN_AS_NODE: "1" },
    stdio: "ignore",
  });
  serverProcess.on("error", (e) => console.error("server error", e));

  await waitForServer(port);
  return port;
}

function buildMenu(win) {
  const template = [
    {
      label: "Jyotish",
      submenu: [
        { role: "reload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "quit" },
      ],
    },
    { role: "editMenu" },
    { role: "viewMenu" },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

async function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    backgroundColor: "#0b0813",
    title: "Jyotish · Vedic Astrology",
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
    show: false,
  });
  buildMenu(win);

  try {
    const port = await startServer();
    await win.loadURL(`http://127.0.0.1:${port}`);
    win.show();
  } catch (e) {
    dialog.showErrorBox("Startup error", String(e));
    app.quit();
  }
}

// --- IPC: version + one-click PDF export ---
ipcMain.handle("get-version", () => app.getVersion());

// Map a provider id → the config.json key field it stores its API key in.
const PROVIDER_KEY_FIELD = {
  deepseek: "deepseekApiKey",
  gemini: "geminiApiKey",
  cerebras: "cerebrasApiKey",
  openrouter: "openrouterApiKey",
  groq: "groqApiKey",
  openai: "openaiApiKey",
  anthropic: "anthropicApiKey",
};

// Save the AI key from inside the app (no file editing, no restart needed —
// the server reads config.json live). Back-compat: a single string arg = Gemini.
ipcMain.handle("set-ai-key", (_e, arg1, arg2) => {
  try {
    const provider = arg2 !== undefined ? String(arg1 || "gemini") : "gemini";
    const key = arg2 !== undefined ? arg2 : arg1;
    const field = PROVIDER_KEY_FIELD[provider] || "geminiApiKey";
    const p = configPath();
    fs.mkdirSync(path.dirname(p), { recursive: true });
    const cfg = loadConfig();
    const k = String(key || "").trim();
    // Clear any previously-stored provider key so only one is active.
    for (const f of Object.values(PROVIDER_KEY_FIELD)) delete cfg[f];
    if (k) {
      cfg[field] = k;
      cfg.aiProvider = provider;
    } else {
      delete cfg.aiProvider;
    }
    fs.writeFileSync(p, JSON.stringify(cfg, null, 2));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
});

// Report whether a key is set (never returns the key itself) + which provider.
ipcMain.handle("get-ai-key", () => {
  const cfg = loadConfig();
  const field = PROVIDER_KEY_FIELD[cfg.aiProvider] || null;
  const k = (field && cfg[field]) || cfg.geminiApiKey || cfg.anthropicApiKey;
  return { hasKey: !!(k && k.length > 10), provider: cfg.aiProvider || null };
});

ipcMain.handle("export-pdf", async (event, suggestedName) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  try {
    const pdf = await win.webContents.printToPDF({
      printBackground: false,
      pageSize: "A4",
      margins: { marginType: "custom", top: 0.5, bottom: 0.5, left: 0.5, right: 0.5 },
    });
    const safe = (suggestedName || "horoscope").replace(/[^\w.-]+/g, "_");
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      title: "Save Horoscope PDF",
      defaultPath: `${safe}.pdf`,
      filters: [{ name: "PDF", extensions: ["pdf"] }],
    });
    if (canceled || !filePath) return { ok: false, canceled: true };
    fs.writeFileSync(filePath, pdf);
    shell.openPath(filePath);
    return { ok: true, filePath };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
});

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (serverProcess) serverProcess.kill();
  if (process.platform !== "darwin") app.quit();
});
app.on("before-quit", () => {
  if (serverProcess) serverProcess.kill();
});
