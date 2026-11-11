#!/usr/bin/env node
// Sidecar entry point for Arya Duta Persentasion Studio.
//
// Contract (Phase 0):
// - Input:  one JSON manifest on stdin, UTF-8, closed by EOF from the parent.
// - Output: exactly one JSON result object on stdout.
// - Errors: JSON with ok=false plus a stable error_code on stdout, exit code 2.
// - Diagnostics that are not part of the contract go to stderr.
//
// The sidecar never receives API credentials and never executes
// model-generated code. It only reads the manifest handed to it.

import { statSync } from "node:fs";
import { mkdir, rename, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { buildPresentation } from "./generator.mjs";
import { validateManifest } from "./validation.mjs";

function readStdinUtf8() {
  return new Promise((resolve, reject) => {
    const chunks = [];
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => chunks.push(chunk));
    process.stdin.on("end", () => resolve(chunks.join("")));
    process.stdin.on("error", reject);
  });
}

function emit(result) {
  process.stdout.write(JSON.stringify(result) + "\n");
}

function fail(errorCode, message) {
  emit({ ok: false, error_code: errorCode, message });
  process.exitCode = 2;
}

async function main() {
  let raw;
  try {
    raw = await readStdinUtf8();
  } catch (error) {
    fail("PPTX_GENERATION_FAILED", `failed to read manifest from stdin: ${error.message}`);
    return;
  }

  if (raw.trim().length === 0) {
    fail("SLIDE_SPEC_INVALID", "empty manifest on stdin");
    return;
  }

  let manifest;
  try {
    manifest = JSON.parse(raw);
  } catch (error) {
    fail("SLIDE_SPEC_INVALID", `manifest is not valid JSON: ${error.message}`);
    return;
  }

  const problems = validateManifest(manifest);
  if (problems.length > 0) {
    fail("SLIDE_SPEC_INVALID", `manifest validation failed: ${problems.join("; ")}`);
    return;
  }

  const outputPath = path.resolve(manifest.output_path);
  const outputDir = path.dirname(outputPath);
  // The temp name must still end in ".pptx": PptxGenJS appends that suffix
  // to any fileName that does not have it.
  const tempPath = path.join(
    outputDir,
    `.${path.basename(outputPath)}.tmp.pptx`
  );

  try {
    const pptx = buildPresentation(manifest);
    await mkdir(outputDir, { recursive: true });

    // Write to a temporary file first, then promote atomically so a failed
    // generation can never overwrite the last known-good deck.
    await rm(tempPath, { force: true });
    await pptx.writeFile({ fileName: tempPath });

    const stats = await statSync(tempPath);
    if (stats.size === 0) {
      throw new Error("generated file is empty");
    }

    await rename(tempPath, outputPath);
    emit({
      ok: true,
      output_path: outputPath,
      slide_count: manifest.slides.length,
      temp_path: tempPath,
    });
  } catch (error) {
    // Clean up the temp file so no partial artifacts linger.
    try {
      await rm(tempPath, { force: true });
    } catch {
      // Best effort; the failure reason is reported below.
    }
    fail("PPTX_GENERATION_FAILED", error.message);
  }
}

main().catch((error) => {
  fail("PPTX_GENERATION_FAILED", `unhandled sidecar error: ${error?.message ?? String(error)}`);
});
