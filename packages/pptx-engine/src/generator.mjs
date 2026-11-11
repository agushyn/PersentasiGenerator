// Presentation builder for the Phase 0 proof of concept.
//
// Every element is emitted as a native, editable PowerPoint construct:
// real text boxes and real shapes. Slides are never flattened into images.

import PptxGenJS from "pptxgenjs";

// Editorial Learning Journal preset from DESIGN.md (presentation output tokens).
const PRESET = {
  paper: "F5F1E8",
  ink: "20201E",
  terracotta: "C65D3B",
  sage: "788477",
  mutedGrey: "8A8982",
  white: "FFFFFF",
};

function addEditorialCover(slide, spec) {
  slide.background = { color: PRESET.paper };

  // Accent bar: a real editable rectangle, not decoration for its own sake.
  slide.addShape("rect", {
    x: 0.6,
    y: 0.65,
    w: 1.45,
    h: 0.09,
    fill: { color: PRESET.terracotta },
  });

  if (spec.kicker) {
    slide.addText(spec.kicker, {
      x: 0.6,
      y: 0.85,
      w: 6.0,
      h: 0.45,
      fontSize: 13,
      fontFace: "Inter",
      color: PRESET.mutedGrey,
      charSpacing: 2,
    });
  }

  slide.addText(spec.title, {
    x: 0.6,
    y: 1.35,
    w: 11.0,
    h: 2.2,
    fontSize: 54,
    bold: true,
    fontFace: "Georgia",
    color: PRESET.ink,
    valign: "top",
  });

  if (spec.subtitle) {
    slide.addText(spec.subtitle, {
      x: 0.6,
      y: 4.0,
      w: 9.5,
      h: 0.9,
      fontSize: 20,
      fontFace: "Inter",
      color: PRESET.sage,
    });
  }
}

function addEditableText(slide, spec) {
  slide.background = { color: PRESET.white };

  slide.addText(spec.heading, {
    x: 0.8,
    y: 0.7,
    w: 11.7,
    h: 1.1,
    fontSize: 34,
    bold: true,
    fontFace: "Georgia",
    color: PRESET.ink,
  });

  // One editable text box; PowerPoint keeps it a normal text frame.
  slide.addText(spec.body, {
    x: 0.8,
    y: 2.1,
    w: 8.2,
    h: 3.4,
    fontSize: 16,
    fontFace: "Inter",
    color: PRESET.ink,
    lineSpacingMultiple: 1.35,
    valign: "top",
  });

  // Side rule to establish editorial structure; still a native shape.
  slide.addShape("rect", {
    x: 9.4,
    y: 2.1,
    w: 0.06,
    h: 3.4,
    fill: { color: PRESET.terracotta },
  });
}

function addEditableShapes(slide, spec) {
  slide.background = { color: PRESET.white };

  for (const item of spec.shapes) {
    const options = {
      x: item.x,
      y: item.y,
      w: item.w,
      h: item.h,
      fill: { color: item.fill },
      line: { color: item.line || item.fill, width: 1 },
    };
    // addText with a shape renders a single object: shape + editable text,
    // exactly as a user would draw it in PowerPoint.
    if (item.text) {
      slide.addText(item.text, {
        ...options,
        shape: item.shape,
        fontFace: "Inter",
        fontSize: item.fontSize || 14,
        color: item.textColor || PRESET.white,
        align: "center",
        valign: "middle",
      });
    } else {
      slide.addShape(item.shape, options);
    }
  }
}

/**
 * Builds the presentation object for the given validated manifest.
 * Returns the PptxGenJS presentation instance; the caller writes it to disk.
 */
export function buildPresentation(manifest) {
  const pptx = new PptxGenJS();

  // 16:9 widescreen is the locked default slide format.
  // Width uses enough decimals so the EMU size lands on the standard
  // 12192000x6858000 used by PowerPoint's built-in 16:9 preset.
  pptx.defineLayout({ name: "WIDE_16x9", width: 13.3333333, height: 7.5 });
  pptx.layout = "WIDE_16x9";

  pptx.author = "Arya Duta Persentasion Studio";
  pptx.company = "Arya Duta Persentasion Studio";
  pptx.title = manifest.slides[0]?.title || "Arya Duta Persentasion Studio";

  for (const spec of manifest.slides) {
    const slide = pptx.addSlide();
    switch (spec.slide_type) {
      case "editorial-cover":
        addEditorialCover(slide, spec);
        break;
      case "editable-text":
        addEditableText(slide, spec);
        break;
      case "editable-shapes":
        addEditableShapes(slide, spec);
        break;
      default:
        throw new Error(`unsupported slide_type: ${spec.slide_type}`);
    }
  }

  return pptx;
}
