// Slide input validation for the Phase 0 sidecar contract.
// The manifest is produced by the Rust backend, which is the trust boundary:
// this validation is defense in depth, not the primary security control.

export const SUPPORTED_SCHEMA_VERSION = "1.0";
export const SUPPORTED_SLIDE_TYPES = ["editorial-cover", "editable-text", "editable-shapes"];

/**
 * Validates a generation manifest. Returns a list of human-readable
 * validation problems. An empty list means the manifest is acceptable.
 */
export function validateManifest(manifest) {
  const problems = [];

  if (manifest === null || typeof manifest !== "object" || Array.isArray(manifest)) {
    return ["manifest must be a JSON object"];
  }

  if (manifest.schema_version !== SUPPORTED_SCHEMA_VERSION) {
    problems.push(`unsupported schema_version, expected "${SUPPORTED_SCHEMA_VERSION}"`);
  }

  if (typeof manifest.output_path !== "string" || manifest.output_path.trim().length === 0) {
    problems.push("output_path must be a non-empty string");
  }

  if (!Array.isArray(manifest.slides) || manifest.slides.length === 0) {
    problems.push("slides must be a non-empty array");
  } else {
    manifest.slides.forEach((slide, index) => {
      const where = `slides[${index}]`;
      if (slide === null || typeof slide !== "object") {
        problems.push(`${where} must be an object`);
        return;
      }
      if (typeof slide.slide_id !== "string" || slide.slide_id.trim().length === 0) {
        problems.push(`${where}.slide_id must be a non-empty string`);
      }
      if (!SUPPORTED_SLIDE_TYPES.includes(slide.slide_type)) {
        problems.push(`${where}.slide_type must be one of: ${SUPPORTED_SLIDE_TYPES.join(", ")}`);
      }
      if (slide.slide_type === "editable-cover") {
        // Guard against typos in future types; covered by the check above.
      }
      if (slide.slide_type === "editorial-cover") {
        if (typeof slide.title !== "string" || slide.title.trim().length === 0) {
          problems.push(`${where}.title must be a non-empty string for editorial-cover`);
        }
      }
      if (slide.slide_type === "editable-text") {
        if (typeof slide.heading !== "string" || slide.heading.trim().length === 0) {
          problems.push(`${where}.heading must be a non-empty string for editable-text`);
        }
        if (typeof slide.body !== "string") {
          problems.push(`${where}.body must be a string for editable-text`);
        }
      }
      if (slide.slide_type === "editable-shapes") {
        if (!Array.isArray(slide.shapes) || slide.shapes.length === 0) {
          problems.push(`${where}.shapes must be a non-empty array for editable-shapes`);
        } else {
          slide.shapes.forEach((shape, shapeIndex) => {
            const shapeWhere = `${where}.shapes[${shapeIndex}]`;
            if (shape === null || typeof shape !== "object") {
              problems.push(`${shapeWhere} must be an object`);
              return;
            }
            if (shape.shape !== "rect" && shape.shape !== "ellipse") {
              problems.push(`${shapeWhere}.shape must be "rect" or "ellipse"`);
            }
            for (const field of ["x", "y", "w", "h"]) {
              const num = shape[field];
              if (typeof num !== "number" || !Number.isFinite(num) || num < 0) {
                problems.push(`${shapeWhere}.${field} must be a non-negative finite number (inches)`);
              }
            }
          });
        }
      }
    });
  }

  return problems;
}
