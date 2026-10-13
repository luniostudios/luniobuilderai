import chromium from "@sparticuz/chromium-min";
import { existsSync } from "node:fs";
import { join } from "node:path";
import puppeteer from "puppeteer-core";

const SAFE_RESOURCE_HOSTS = new Set([
  "fonts.googleapis.com",
  "fonts.gstatic.com",
  "images.unsplash.com",
]);

const remotePath = "https://github.com/Sparticuz/chromium/releases/download/v138.0.1/chromium-v138.0.1-pack.tar";

type Browser = Awaited<ReturnType<typeof puppeteer.launch>>;

let browserPromise: Promise<Browser> | undefined;

function getLocalExecutable(): string | undefined {
  if (process.env.CHROME_EXECUTABLE_PATH) return process.env.CHROME_EXECUTABLE_PATH;
  if (process.platform !== "win32") return undefined;

  const candidates = [
    process.env.PROGRAMFILES && join(process.env.PROGRAMFILES, "Google", "Chrome", "Application", "chrome.exe"),
    process.env["PROGRAMFILES(X86)"] && join(process.env["PROGRAMFILES(X86)"], "Google", "Chrome", "Application", "chrome.exe"),
    process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, "Google", "Chrome", "Application", "chrome.exe"),
    process.env.PROGRAMFILES && join(process.env.PROGRAMFILES, "Microsoft", "Edge", "Application", "msedge.exe"),
  ];
  return candidates.find((candidate): candidate is string => Boolean(candidate && existsSync(candidate)));
}

async function launchBrowser(): Promise<Browser> {
  const localExecutable = getLocalExecutable();

  if (localExecutable) {
    return puppeteer.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      executablePath: await chromium.executablePath(remotePath),
      headless: true,
      defaultViewport: { width: 1280, height: 800, deviceScaleFactor: 1 },
    });
  } else {
    const packUrl = process.env.CHROMIUM_PACK_URL;
    if (!packUrl) throw new Error("Set CHROMIUM_PACK_URL or CHROME_EXECUTABLE_PATH to enable screenshots.");

    chromium.setGraphicsMode = false;
    return puppeteer.launch({
      args: await puppeteer.defaultArgs({ args: chromium.args, headless: "shell" }),
      executablePath: await chromium.executablePath(packUrl),
      headless: "shell",
      defaultViewport: { width: 1280, height: 800, deviceScaleFactor: 1 },
    });
  }
}

async function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    const launching = launchBrowser();
    browserPromise = launching;
    void launching.then((browser) => {
      browser.once("disconnected", () => {
        if (browserPromise === launching) browserPromise = undefined;
      });
    }).catch(() => {
      if (browserPromise === launching) browserPromise = undefined;
    });
  }
  return browserPromise;
}

export async function renderProjectScreenshot(html: string): Promise<Uint8Array> {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    page.setDefaultNavigationTimeout(10000);
    await page.setJavaScriptEnabled(false);
    await page.setRequestInterception(true);
    page.on("request", (request) => {
      try {
        const url = new URL(request.url());
        const allowedData = url.protocol === "data:";
        const allowedRemoteResource = url.protocol === "https:" &&
          SAFE_RESOURCE_HOSTS.has(url.hostname) &&
          ["image", "stylesheet", "font"].includes(request.resourceType());
        if (allowedData || allowedRemoteResource) void request.continue();
        else void request.abort();
      } catch {
        void request.abort();
      }
    });

    await page.setContent(html, { waitUntil: "domcontentloaded", timeout: 10000 });
    await page.evaluate(async () => {
      const imageLoads = Array.from(document.images, (image) => image.decode().catch(() => undefined));
      await Promise.race([
        Promise.all([document.fonts.ready, ...imageLoads]),
        new Promise((resolve) => window.setTimeout(resolve, 2500)),
      ]);
    });

    return await page.screenshot({ type: "png" });
  } finally {
    await page.close();
  }
}