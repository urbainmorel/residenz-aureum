import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  loadContactRuntimeConfig,
  normalizeApprovalRef,
} from "../server/runtime/config.js";

async function loadOrganization(projectRoot) {
  return JSON.parse(
    await readFile(resolve(projectRoot, "src/data/organization.json"), "utf8"),
  );
}

export async function validateRuntimeEnvironment(
  env = process.env,
  {
    expectedMode = "production",
    organization,
    projectRoot = process.cwd(),
  } = {},
) {
  const config = loadContactRuntimeConfig(env);
  if (config.runtimeMode !== expectedMode) {
    throw new Error(
      `CONTACT_RUNTIME_MODE doit valoir ${expectedMode} pour cette validation.`,
    );
  }
  if (expectedMode === "production" && config.transportMode !== "resend") {
    throw new Error("Le transport Resend est obligatoire en production.");
  }
  if (expectedMode === "production") {
    const operationalData =
      organization ?? (await loadOrganization(projectRoot));
    const contact = operationalData?.contact;
    let normalizedContactApproval;
    try {
      normalizedContactApproval = normalizeApprovalRef(contact?.approvalRef);
    } catch {
      normalizedContactApproval = "";
    }
    if (
      contact?.status !== "validated" ||
      !normalizedContactApproval ||
      contact.phoneHref !== config.fallbackPhone
    ) {
      throw new Error(
        "Le téléphone de repli doit correspondre aux coordonnées client validées et approuvées.",
      );
    }
  }
  return {
    allowedOriginCount: config.allowedOrigins.size,
    runtimeMode: config.runtimeMode,
    transportMode: config.transportMode,
  };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await validateRuntimeEnvironment();
  console.info(
    `Runtime contact valide: ${result.runtimeMode}, transport ${result.transportMode}, ${result.allowedOriginCount} origine(s).`,
  );
}
