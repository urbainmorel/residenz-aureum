const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const process = require("node:process");

const originalRmSync = fs.rmSync.bind(fs);
const temporaryRoot = path.resolve(os.tmpdir());

fs.rmSync = (target, options) => {
  try {
    return originalRmSync(target, options);
  } catch (error) {
    const resolvedTarget = path.resolve(target);
    const isLighthouseTemporaryDirectory =
      process.platform === "win32" &&
      path.dirname(resolvedTarget) === temporaryRoot &&
      /^lighthouse\.\d+$/.test(path.basename(resolvedTarget));
    const isTransientWindowsLock = ["EBUSY", "ENOENT", "EPERM"].includes(
      error?.code,
    );

    if (isLighthouseTemporaryDirectory && isTransientWindowsLock) {
      return undefined;
    }

    throw error;
  }
};
