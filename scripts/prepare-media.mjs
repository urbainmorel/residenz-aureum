import { execFile } from "node:child_process";
import {
  copyFile,
  mkdir,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";

const execFileAsync = promisify(execFile);
const LANDSCAPE_WIDTHS = [480, 768, 1024, 1440, 1536];
const PORTRAIT_WIDTHS = [480, 768];
const REGISTER_PATH = "assets/media/ai-assets.json";

function readMode(argv) {
  const index = argv.indexOf("--mode");
  const mode = index >= 0 ? argv[index + 1] : "preview";
  if (!["preview", "production"].includes(mode)) {
    throw new Error(`Mode média inconnu: ${mode}`);
  }
  return mode;
}

function greatestCommonDivisor(left, right) {
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b > 0) {
    [a, b] = [b, a % b];
  }
  return a;
}

function ratioFor(width, height) {
  const divisor = greatestCommonDivisor(width, height);
  return `${width / divisor}:${height / divisor}`;
}

function asPosix(path) {
  return path.split(sep).join("/");
}

function assertManagedDirectory(projectRoot, target, expectedSuffix) {
  const relativeTarget = relative(projectRoot, target);
  if (
    relativeTarget.startsWith("..") ||
    resolve(projectRoot, relativeTarget) !== target ||
    asPosix(relativeTarget) !== expectedSuffix
  ) {
    throw new Error(`Répertoire média non sûr: ${target}`);
  }
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function probeDimensions(path) {
  const { stdout } = await execFileAsync("ffprobe", [
    "-v",
    "error",
    "-select_streams",
    "v:0",
    "-show_entries",
    "stream=width,height",
    "-of",
    "json",
    path,
  ]);
  const stream = JSON.parse(stdout).streams?.[0];
  if (!stream?.width || !stream?.height) {
    throw new Error(`Dimensions WebP introuvables: ${path}`);
  }
  return { width: stream.width, height: stream.height };
}

function variantFilter(asset, width, format) {
  if (format === "landscape") {
    return `scale=${width}:-2:flags=lanczos`;
  }

  const cropWidth = Math.min(asset.width, Math.round((asset.height * 3) / 4));
  const cropX = Math.max(
    0,
    Math.min(
      asset.width - cropWidth,
      Math.round(asset.width * asset.focalPoint.x - cropWidth / 2),
    ),
  );
  return `crop=${cropWidth}:${asset.height}:${cropX}:0,scale=${width}:-2:flags=lanczos`;
}

function budgetFor(asset, format) {
  if (asset.scene === "hero-garden") {
    return format === "portrait" ? 250 * 1024 : 450 * 1024;
  }
  return 200 * 1024;
}

async function encodeWithinBudget({
  asset,
  format,
  sourcePath,
  targetPath,
  width,
}) {
  await mkdir(dirname(targetPath), { recursive: true });
  const budget = budgetFor(asset, format);
  let quality = 80;

  while (quality >= 45) {
    await execFileAsync("ffmpeg", [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-i",
      sourcePath,
      "-vf",
      variantFilter(asset, width, format),
      "-frames:v",
      "1",
      "-c:v",
      "libwebp",
      "-preset",
      "picture",
      "-quality",
      String(quality),
      "-compression_level",
      "6",
      "-map_metadata",
      "-1",
      "-an",
      targetPath,
    ]);

    const size = (await stat(targetPath)).size;
    if (size <= budget) {
      return { quality, size };
    }
    quality -= 5;
  }

  throw new Error(
    `Impossible de respecter le budget de ${Math.round(budget / 1024)} Kio pour ${targetPath}.`,
  );
}

function derivedAsset({ base, dimensions, format, id, path, previewOnly }) {
  return {
    id,
    path,
    provenance:
      "Responsive WebP derivative generated locally from the registered OpenAI source with FFmpeg 8.1.1.",
    prompt: base.prompt,
    generatedAt: base.generatedAt,
    width: dimensions.width,
    height: dimensions.height,
    ratio: ratioFor(dimensions.width, dimensions.height),
    focalPoint: base.focalPoint,
    alt: base.alt,
    scene: base.scene,
    variantOf: base.id,
    format,
    selected: true,
    previewOnly,
    representsResidence: false,
    approvalStatus: base.approvalStatus,
    approvalReference: base.approvalReference,
  };
}

export async function prepareMedia({
  mode = "preview",
  projectRoot = process.cwd(),
} = {}) {
  if (!["preview", "production"].includes(mode)) {
    throw new Error(`Mode média inconnu: ${mode}`);
  }

  const registerPath = resolve(projectRoot, REGISTER_PATH);
  const register = await readJson(registerPath);
  const candidates = register.assets.filter(
    ({ path, variantOf }) =>
      variantOf === null && path.startsWith("assets/media/candidates/"),
  );
  const selected = candidates.filter(({ selected: isSelected }) => isSelected);

  if (candidates.length !== 15 || selected.length !== 7) {
    throw new Error(
      `Sélection média invalide: ${candidates.length} candidats et ${selected.length} sélections.`,
    );
  }

  if (mode === "production") {
    const blocked = selected.filter(
      ({ approvalReference, approvalStatus }) =>
        approvalStatus !== "approved" || !approvalReference,
    );
    if (blocked.length > 0) {
      throw new Error(
        `Préparation production bloquée: médias non approuvés (${blocked.map(({ id }) => id).join(", ")}).`,
      );
    }
  }

  const variantsRoot = resolve(projectRoot, "assets/media/variants");
  const publicMediaRoot = resolve(projectRoot, "public/media");
  assertManagedDirectory(projectRoot, variantsRoot, "assets/media/variants");
  assertManagedDirectory(projectRoot, publicMediaRoot, "public/media");
  await rm(variantsRoot, { force: true, recursive: true });
  await rm(publicMediaRoot, { force: true, recursive: true });

  const generated = [];
  const delivered = [];

  for (const base of selected) {
    const sourcePath = resolve(projectRoot, base.path);
    const sourceDimensions = await probeDimensions(sourcePath);
    if (
      sourceDimensions.width !== base.width ||
      sourceDimensions.height !== base.height
    ) {
      throw new Error(
        `Dimensions source incohérentes pour ${base.id}: registre ${base.width}×${base.height}, fichier ${sourceDimensions.width}×${sourceDimensions.height}.`,
      );
    }

    const formats = [
      { format: "landscape", widths: LANDSCAPE_WIDTHS },
      ...(base.id === "hero-garden-a"
        ? [{ format: "portrait", widths: PORTRAIT_WIDTHS }]
        : []),
    ];

    for (const { format, widths } of formats) {
      for (const width of widths.filter((value) => value <= base.width)) {
        const suffix =
          format === "portrait" ? `portrait-${width}w` : `${width}w`;
        const fileName = `${base.id}-${suffix}.webp`;
        const variantRelative = `assets/media/variants/${base.id}/${fileName}`;
        const variantPath = resolve(projectRoot, variantRelative);
        await encodeWithinBudget({
          asset: base,
          format,
          sourcePath,
          targetPath: variantPath,
          width,
        });
        const dimensions = await probeDimensions(variantPath);
        const variantId = `${base.id}-${format}-${width}w`;
        generated.push(
          derivedAsset({
            base,
            dimensions,
            format,
            id: variantId,
            path: variantRelative,
            previewOnly: false,
          }),
        );

        const deliveryPrefix =
          mode === "preview" ? "public/media/preview" : "public/media";
        const deliveryRelative = `${deliveryPrefix}/${base.id}/${fileName}`;
        const deliveryPath = resolve(projectRoot, deliveryRelative);
        await mkdir(dirname(deliveryPath), { recursive: true });
        await copyFile(variantPath, deliveryPath);
        delivered.push(
          derivedAsset({
            base,
            dimensions,
            format,
            id: `${mode}-${variantId}`,
            path: deliveryRelative,
            previewOnly: mode === "preview",
          }),
        );
      }
    }
  }

  const nextRegister = {
    $schema: register.$schema,
    assets: [...candidates, ...generated, ...delivered],
  };
  await writeFile(
    registerPath,
    `${JSON.stringify(nextRegister, null, 2)}\n`,
    "utf8",
  );

  return {
    candidates: candidates.length,
    delivered: delivered.length,
    mode,
    selected: selected.length,
    variants: generated.length,
  };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await prepareMedia({ mode: readMode(process.argv.slice(2)) });
  console.info(
    `Médias ${result.mode} préparés: ${result.candidates} candidats, ${result.selected} sélections, ${result.variants} variantes et ${result.delivered} fichiers livrés.`,
  );
}
