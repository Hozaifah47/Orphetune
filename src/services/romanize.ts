import Sanscript from "@indic-transliteration/sanscript";

const scripts: [RegExp, string][] = [
  [/[\u0900-\u097f]+/gu, "devanagari"], [/[\u0600-\u06ff]+/gu, "urdu"],
  [/[\u0980-\u09ff]+/gu, "bengali"], [/[\u0a00-\u0a7f]+/gu, "gurmukhi"],
  [/[\u0a80-\u0aff]+/gu, "gujarati"], [/[\u0b00-\u0b7f]+/gu, "oriya"],
  [/[\u0b80-\u0bff]+/gu, "tamil"], [/[\u0c00-\u0c7f]+/gu, "telugu"],
  [/[\u0c80-\u0cff]+/gu, "kannada"], [/[\u0d00-\u0d7f]+/gu, "malayalam"],
];

export function romanize(text: string): string {
  for (const [pattern, script] of scripts) {
    text = text.replace(pattern, word => Sanscript.t(word, script, "iast"));
  }
  return text;
}
