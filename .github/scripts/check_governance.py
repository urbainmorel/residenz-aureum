#!/usr/bin/env python3
"""Contrôles de gouvernance autonomes, sans dépendance de projet."""

from __future__ import annotations

import json
import os
from pathlib import Path, PurePosixPath
import subprocess
import sys

try:
    import tomllib
except ModuleNotFoundError:
    print("ERREUR: Python 3.11 ou supérieur est requis pour valider les TOML.")
    raise SystemExit(2)


ROOT = Path(__file__).resolve().parents[2]
MAX_AGENTS_BYTES = 32_768

REQUIRED_FILES = (
    "AGENTS.md",
    "CONTRIBUTING.md",
    ".gitignore",
    ".gitattributes",
    ".editorconfig",
    ".codex/config.toml",
    ".codex/agents/product-content.toml",
    ".codex/agents/design-a11y.toml",
    ".codex/agents/frontend-performance.toml",
    ".codex/agents/backend-security.toml",
    ".codex/agents/qa-reviewer.toml",
    ".github/CODEOWNERS",
    ".github/PULL_REQUEST_TEMPLATE.md",
    ".github/ISSUE_TEMPLATE/config.yml",
    ".github/ISSUE_TEMPLATE/task.yml",
    ".github/ISSUE_TEMPLATE/content-validation.yml",
    ".github/workflows/governance.yml",
    ".github/scripts/check_governance.py",
)

REFERENCE_RASTERS = {
    PurePosixPath("01-quiet-luxury-desktop.png"),
    PurePosixPath("01-quiet-luxury-mobile.png"),
}
AI_ASSET_REGISTER = PurePosixPath("assets/media/ai-assets.json")

FORBIDDEN_RASTER_EXTENSIONS = {
    ".avif",
    ".bmp",
    ".gif",
    ".ico",
    ".jpeg",
    ".jpg",
    ".png",
    ".tif",
    ".tiff",
}

ALLOWED_SVG_DIRECTORY_PAIRS = {
    ("assets", "icons"),
    ("assets", "logos"),
    ("public", "icons"),
    ("public", "logos"),
}

IGNORED_UNTRACKED_DIRECTORIES = {
    ".git",
    ".cache",
    ".venv",
    "coverage",
    "dist",
    "node_modules",
}


def normalized(relative_path: str | Path) -> PurePosixPath:
    """Retourne un chemin relatif portable, sans préfixe `./`."""
    return PurePosixPath(Path(relative_path).as_posix().removeprefix("./"))


def tracked_files() -> list[PurePosixPath]:
    """Inventorie les fichiers suivis et non ignorés, avant ou après `git init`."""
    result = subprocess.run(
        ["git", "ls-files", "--cached", "--others", "--exclude-standard", "-z"],
        cwd=ROOT,
        capture_output=True,
        check=False,
    )
    if result.returncode == 0:
        return sorted(
            normalized(os.fsdecode(item))
            for item in result.stdout.split(b"\0")
            if item
        )

    files: list[PurePosixPath] = []
    for path in ROOT.rglob("*"):
        if not path.is_file():
            continue
        relative = path.relative_to(ROOT)
        if any(part in IGNORED_UNTRACKED_DIRECTORIES for part in relative.parts):
            continue
        files.append(normalized(relative))
    return sorted(files)


def svg_location_is_allowed(path: PurePosixPath) -> bool:
    lowered = tuple(part.lower() for part in path.parts)
    if PurePosixPath(*lowered) == PurePosixPath("public/favicon.svg"):
        return True
    return any(
        pair in ALLOWED_SVG_DIRECTORY_PAIRS
        for pair in zip(lowered, lowered[1:])
    )


def validate_ai_asset_register(
    files: list[PurePosixPath],
    file_set: set[PurePosixPath],
) -> list[str]:
    """Vérifie la traçabilité de chaque WebP ajouté au dépôt."""
    errors: list[str] = []
    webp_paths = {path for path in files if path.suffix.lower() == ".webp"}
    if not webp_paths:
        return errors

    if AI_ASSET_REGISTER not in file_set:
        return [
            "registre IA absent: assets/media/ai-assets.json est requis "
            "dès qu’un WebP est versionné"
        ]

    register_path = ROOT / Path(*AI_ASSET_REGISTER.parts)
    try:
        payload = json.loads(register_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        return [f"registre IA invalide: {AI_ASSET_REGISTER}: {exc}"]

    assets = payload.get("assets") if isinstance(payload, dict) else None
    if not isinstance(assets, list):
        return [f"registre IA invalide: {AI_ASSET_REGISTER} doit contenir une liste `assets`"]

    registered: set[PurePosixPath] = set()
    for index, asset in enumerate(assets):
        label = f"{AI_ASSET_REGISTER} assets[{index}]"
        if not isinstance(asset, dict):
            errors.append(f"{label}: entrée objet requise")
            continue

        raw_path = asset.get("path")
        if not isinstance(raw_path, str) or not raw_path.strip():
            errors.append(f"{label}: `path` non vide requis")
            continue

        path = normalized(raw_path)
        if path in registered:
            errors.append(f"{label}: chemin dupliqué `{path}`")
        registered.add(path)

        required_strings = ("provenance", "prompt", "generatedAt", "ratio")
        for field in required_strings:
            if not isinstance(asset.get(field), str) or not asset[field].strip():
                errors.append(f"{label}: `{field}` non vide requis")

        for field in ("width", "height"):
            value = asset.get(field)
            if not isinstance(value, int) or isinstance(value, bool) or value <= 0:
                errors.append(f"{label}: `{field}` doit être un entier positif")

        focal_point = asset.get("focalPoint")
        if not isinstance(focal_point, dict):
            errors.append(f"{label}: objet `focalPoint` requis")
        else:
            for axis in ("x", "y"):
                value = focal_point.get(axis)
                if (
                    not isinstance(value, (int, float))
                    or isinstance(value, bool)
                    or not 0 <= value <= 1
                ):
                    errors.append(f"{label}: `focalPoint.{axis}` doit être compris entre 0 et 1")

        alt = asset.get("alt")
        if not isinstance(alt, dict):
            errors.append(f"{label}: objet `alt` requis")
        else:
            for locale in ("de", "fr"):
                if not isinstance(alt.get(locale), str):
                    errors.append(f"{label}: `alt.{locale}` doit être une chaîne")

        represents_residence = asset.get("representsResidence")
        if not isinstance(represents_residence, bool):
            errors.append(f"{label}: booléen `representsResidence` requis")

        approval_status = asset.get("approvalStatus")
        if approval_status not in {"pending", "approved", "rejected"}:
            errors.append(
                f"{label}: `approvalStatus` doit être pending, approved ou rejected"
            )

        approval_reference = asset.get("approvalReference")
        if approval_status == "approved" and (
            not isinstance(approval_reference, str) or not approval_reference.strip()
        ):
            errors.append(f"{label}: `approvalReference` requis pour un asset approuvé")

        is_public = bool(path.parts) and path.parts[0].lower() == "public"
        if is_public and approval_status != "approved":
            errors.append(
                f"{label}: tout asset IA dans `public/` doit être approuvé"
            )

    missing = webp_paths - registered
    stale = registered - webp_paths
    for path in sorted(missing):
        errors.append(f"WebP absent du registre IA: {path}")
    for path in sorted(stale):
        errors.append(f"entrée de registre IA sans WebP correspondant: {path}")

    return errors


def main() -> int:
    errors: list[str] = []
    files = tracked_files()
    file_set = set(files)

    for required in REQUIRED_FILES:
        required_path = normalized(required)
        if required_path not in file_set or not (ROOT / Path(required)).is_file():
            errors.append(f"fichier requis absent: {required}")

    agents_path = ROOT / "AGENTS.md"
    if agents_path.is_file():
        agents_size = agents_path.stat().st_size
        if agents_size >= MAX_AGENTS_BYTES:
            errors.append(
                "AGENTS.md doit rester strictement inférieur à "
                f"{MAX_AGENTS_BYTES} octets (actuel: {agents_size})."
            )

    for path in files:
        basename = path.name.lower()

        if basename.startswith(".env") and basename != ".env.example":
            errors.append(
                f"fichier d’environnement interdit au versionnement: {path}"
            )

        suffix = path.suffix.lower()
        if suffix in FORBIDDEN_RASTER_EXTENSIONS and path not in REFERENCE_RASTERS:
            errors.append(
                f"raster non-WebP interdit: {path} "
                "(seules les deux maquettes PNG racine sont exemptées)"
            )

        if suffix == ".svg" and not svg_location_is_allowed(path):
            errors.append(
                f"SVG hors emplacement autorisé: {path} "
                "(utiliser un dossier assets/public logos/icons ou public/favicon.svg)"
            )

        if suffix == ".toml":
            absolute_path = ROOT / Path(*path.parts)
            try:
                with absolute_path.open("rb") as handle:
                    tomllib.load(handle)
            except (OSError, tomllib.TOMLDecodeError) as exc:
                errors.append(f"TOML invalide: {path}: {exc}")

    errors.extend(validate_ai_asset_register(files, file_set))

    if errors:
        print("ÉCHEC DES CONTRÔLES DE GOUVERNANCE")
        for error in sorted(set(errors)):
            print(f"- {error}")
        return 1

    print(
        "Contrôles de gouvernance réussis: fichiers requis, TOML, "
        "environnements, extensions médias et registre IA conformes."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
