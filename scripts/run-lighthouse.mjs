import { spawn } from "node:child_process";
import { access, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";

const projectRoot = process.cwd();
const clientDirectory = resolve(projectRoot, "dist/client");
const reportDirectory = resolve(projectRoot, "lighthouse-reports");
const lhciCli = resolve(projectRoot, "node_modules/@lhci/cli/src/cli.js");
const chromePath = chromium.executablePath();
const windowsCleanupShim = resolve(
  projectRoot,
  "scripts/lighthouse-windows-shim.cjs",
);

await access(clientDirectory);
await access(lhciCli);
await access(chromePath);
await access(windowsCleanupShim);
await rm(reportDirectory, { force: true, recursive: true });

const lhciArguments = [lhciCli, "autorun", "--config=lighthouserc.json"];
if (/^[1-9]\d*$/.test(process.env.LHCI_RUNS ?? "")) {
  lhciArguments.push(`--collect.numberOfRuns=${process.env.LHCI_RUNS}`);
}
if (/^\/[a-z0-9/-]*$/i.test(process.env.LHCI_PATH ?? "")) {
  lhciArguments.push(`--collect.url=http://localhost${process.env.LHCI_PATH}`);
}

const nodeOptions =
  process.platform === "win32"
    ? [process.env.NODE_OPTIONS, `--require=${windowsCleanupShim}`]
        .filter(Boolean)
        .join(" ")
    : process.env.NODE_OPTIONS;

const exitCode = await new Promise((resolveExit, reject) => {
  const child = spawn(process.execPath, lhciArguments, {
    cwd: projectRoot,
    env: {
      ...process.env,
      CHROME_PATH: chromePath,
      ...(nodeOptions ? { NODE_OPTIONS: nodeOptions } : {}),
    },
    stdio: "inherit",
  });

  child.once("error", reject);
  child.once("exit", (code, signal) => {
    if (signal) {
      reject(new Error(`Lighthouse interrompu par le signal ${signal}.`));
      return;
    }
    resolveExit(code ?? 1);
  });
});

if (exitCode !== 0) {
  throw new Error(`Lighthouse CI a échoué avec le code ${exitCode}.`);
}
