import { open, readFile, stat } from "node:fs/promises";
import { extname, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { walkFiles } from "./lib/files.mjs";

const EXPECTED_CANDIDATES = 15;
const EXPECTED_SELECTED = 7;
const LANDSCAPE_WIDTHS = [480, 768, 1024, 1440, 1536];
const PORTRAIT_WIDTHS = [480, 768];

function asPosix(path) {
  return path.split(sep).join("/");
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function formatAjvErrors(errors = []) {
  return errors
    .map(({ instancePath, message }) => `${instancePath || "/"} ${message}`)
    .join("; ");
}

async function existingFiles(directory) {
  try {
    return await walkFiles(directory);
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

function webpDimensions(buffer, path) {
  if (
    buffer.length < 30 ||
    buffer.toString("ascii", 0, 4) !== "RIFF" ||
    buffer.toString("ascii", 8, 12) !== "WEBP"
  ) {
    throw new Error(`Fichier WebP invalide: ${path}`);
  }

  const chunk = buffer.toString("ascii", 12, 16);
  if (chunk === "VP8X") {
    return {
      width: 1 + buffer.readUIntLE(24, 3),
      height: 1 + buffer.readUIntLE(27, 3),
    };
  }
  if (chunk === "VP8 ") {
    return {
      width: buffer.readUInt16LE(26) & 0x3fff,
      height: buffer.readUInt16LE(28) & 0x3fff,
    };
  }
  if (chunk === "VP8L" && buffer[20] === 0x2f) {
    return {
      width: 1 + ((buffer[21] | (buffer[22] << 8)) & 0x3fff),
      height:
        1 +
        (((buffer[22] >> 6) | (buffer[23] << 2) | (buffer[24] << 10)) & 0x3fff),
    };
  }
  throw new Error(`Encodage WebP non reconnu (${chunk}) pour ${path}`);
}

async function inspectWebp(path) {
  const handle = await open(path, "r");
  try {
    const buffer = Buffer.alloc(32);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    return webpDimensions(buffer.subarray(0, bytesRead), path);
  } finally {
    await handle.close();
  }
}

function collectMediaReferences(value) {
  if (Array.isArray(value)) {
    return value.flatMap(collectMediaReferences);
  }
  if (!value || typeof value !== "object") {
    return [];
  }

  return Object.entries(value).flatMap(([key, child]) =>
    ["heroMediaId", "mediaId"].includes(key)
      ? [child]
      : collectMediaReferences(child),
  );
}

function assertUnique(values, label) {
  const duplicates = values.filter(
    (value, index) => values.indexOf(value) !== index,
  );
  if (duplicates.length > 0) {
    throw new Error(
      `${label}: doublons (${[...new Set(duplicates)].join(", ")}).`,
    );
  }
}

function assertResponsiveSet(entries, widths, label) {
  const actual = entries
    .map(({ width }) => width)
    .sort((left, right) => left - right);
  if (JSON.stringify(actual) !== JSON.stringify(widths)) {
    throw new Error(
      `${label}: largeurs ${actual.join(", ") || "aucune"} au lieu de ${widths.join(", ")}.`,
    );
  }
}

export async function validateMedia({
  mode = "preview",
  projectRoot = process.cwd(),
} = {}) {
  if (!["preview", "production"].includes(mode)) {
    throw new Error(`Mode média inconnu: ${mode}`);
  }

  const schema = await readJson(
    resolve(projectRoot, "schemas/media.schema.json"),
  );
  const register = await readJson(
    resolve(projectRoot, "assets/media/ai-assets.json"),
  );
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  if (!validate(register)) {
    throw new Error(
      `Registre médias invalide: ${formatAjvErrors(validate.errors)}`,
    );
  }

  assertUnique(
    register.assets.map(({ id }) => id),
    "Identifiants médias",
  );
  assertUnique(
    register.assets.map(({ path }) => path),
    "Chemins médias",
  );

  const candidates = register.assets.filter(
    ({ path, variantOf }) =>
      variantOf === null && path.startsWith("assets/media/candidates/"),
  );
  const selected = candidates.filter(({ selected: isSelected }) => isSelected);
  if (
    candidates.length !== EXPECTED_CANDIDATES ||
    selected.length !== EXPECTED_SELECTED
  ) {
    throw new Error(
      `Inventaire médias incomplet: ${candidates.length}/${EXPECTED_CANDIDATES} candidats, ${selected.length}/${EXPECTED_SELECTED} sélectionnés.`,
    );
  }

  const content = await Promise.all(
    ["de", "fr"].map((locale) =>
      readJson(resolve(projectRoot, `src/content/${locale}/pages.json`)),
    ),
  );
  const references = [...new Set(content.flatMap(collectMediaReferences))];
  const baseById = new Map(candidates.map((asset) => [asset.id, asset]));
  const invalidReferences = references.filter(
    (id) => !baseById.get(id)?.selected,
  );
  if (invalidReferences.length > 0) {
    throw new Error(
      `Références médias absentes ou non sélectionnées: ${invalidReferences.join(", ")}.`,
    );
  }

  const mediaRoots = [
    resolve(projectRoot, "assets/media"),
    resolve(projectRoot, "public/media"),
  ];
  const mediaFiles = (
    await Promise.all(mediaRoots.map((directory) => existingFiles(directory)))
  ).flat();
  const webpFiles = mediaFiles.filter(
    (path) => extname(path).toLowerCase() === ".webp",
  );
  const registeredPaths = new Set(register.assets.map(({ path }) => path));
  const filePaths = new Set(
    webpFiles.map((path) => asPosix(relative(projectRoot, path))),
  );
  const missingFiles = [...registeredPaths].filter(
    (path) => !filePaths.has(path),
  );
  const missingEntries = [...filePaths].filter(
    (path) => !registeredPaths.has(path),
  );
  if (missingFiles.length > 0 || missingEntries.length > 0) {
    throw new Error(
      `Registre et fichiers WebP incohérents. Fichiers manquants: ${missingFiles.join(", ") || "aucun"}; entrées manquantes: ${missingEntries.join(", ") || "aucune"}.`,
    );
  }

  const forbiddenRasters = mediaFiles.filter((path) =>
    [".avif", ".gif", ".jpeg", ".jpg", ".png"].includes(
      extname(path).toLowerCase(),
    ),
  );
  if (forbiddenRasters.length > 0) {
    throw new Error(
      `Formats raster interdits dans les médias: ${forbiddenRasters.map((path) => relative(projectRoot, path)).join(", ")}.`,
    );
  }

  const assetById = new Map(register.assets.map((asset) => [asset.id, asset]));
  for (const asset of register.assets) {
    const dimensions = await inspectWebp(resolve(projectRoot, asset.path));
    if (
      dimensions.width !== asset.width ||
      dimensions.height !== asset.height
    ) {
      throw new Error(
        `${asset.id}: dimensions déclarées ${asset.width}×${asset.height}, fichier ${dimensions.width}×${dimensions.height}.`,
      );
    }
    if (asset.variantOf) {
      const source = assetById.get(asset.variantOf);
      if (!source || source.variantOf !== null) {
        throw new Error(`${asset.id}: source de variante invalide.`);
      }
      if (asset.width > source.width || asset.height > source.height) {
        throw new Error(`${asset.id}: agrandissement artificiel interdit.`);
      }
    }
  }

  const deliveryPrefix =
    mode === "preview" ? "public/media/preview/" : "public/media/";
  for (const base of selected) {
    const delivered = register.assets.filter(
      ({ path, variantOf }) =>
        variantOf === base.id && path.startsWith(deliveryPrefix),
    );
    assertResponsiveSet(
      delivered.filter(({ format }) => format === "landscape"),
      LANDSCAPE_WIDTHS,
      `${base.id} paysage ${mode}`,
    );
    const portraits = delivered.filter(({ format }) => format === "portrait");
    assertResponsiveSet(
      portraits,
      base.id === "hero-garden-a" ? PORTRAIT_WIDTHS : [],
      `${base.id} portrait ${mode}`,
    );
  }

  const publicAssets = register.assets.filter(({ path }) =>
    path.startsWith("public/"),
  );
  if (mode === "production") {
    const previewAssets = register.assets.filter(
      ({ path, previewOnly }) =>
        previewOnly || path.startsWith("public/media/preview/"),
    );
    if (previewAssets.length > 0) {
      throw new Error(
        "Build production bloqué: des médias de preview sont encore publics.",
      );
    }
  }

  for (const asset of publicAssets) {
    const isPreview = asset.path.startsWith("public/media/preview/");
    if (
      asset.approvalStatus !== "approved" &&
      !(
        mode === "preview" &&
        isPreview &&
        asset.approvalStatus === "pending" &&
        asset.previewOnly &&
        !asset.representsResidence
      )
    ) {
      throw new Error(
        `${asset.id}: asset public non approuvé hors exception preview.`,
      );
    }

    const size = (await stat(resolve(projectRoot, asset.path))).size;
    const limit =
      asset.scene === "hero-garden"
        ? asset.format === "portrait"
          ? 250 * 1024
          : 450 * 1024
        : 200 * 1024;
    if (size > limit) {
      throw new Error(
        `${asset.id}: ${Math.ceil(size / 1024)} Kio dépasse ${limit / 1024} Kio.`,
      );
    }
  }

  if (mode === "production") {
    const unapproved = references.filter((id) => {
      const asset = baseById.get(id);
      return asset.approvalStatus !== "approved" || !asset.approvalReference;
    });
    if (unapproved.length > 0) {
      throw new Error(
        `Build production bloqué: médias référencés non approuvés (${unapproved.join(", ")}).`,
      );
    }
  }

  return {
    assets: register.assets.length,
    candidates: candidates.length,
    delivered: publicAssets.length,
    references: references.length,
    selected: selected.length,
  };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const modeIndex = process.argv.indexOf("--mode");
  const mode = modeIndex >= 0 ? process.argv[modeIndex + 1] : "preview";
  const result = await validateMedia({ mode });
  console.info(
    `Médias ${mode} valides: ${result.candidates} candidats, ${result.selected} sélections, ${result.delivered} fichiers publics et ${result.references} références de contenu.`,
  );
}
