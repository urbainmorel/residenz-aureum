import { readdir } from "node:fs/promises";
import { resolve } from "node:path";

export async function walkFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const path = resolve(directory, entry.name);
      return entry.isDirectory() ? walkFiles(path) : [path];
    }),
  );

  return nested.flat();
}
