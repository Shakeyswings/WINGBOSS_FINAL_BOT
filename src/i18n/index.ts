import { en } from "./en.ts";
import { km } from "./km.ts";

export type Lang = "km" | "en";

export function buildTranslator(lang: Lang, includeEnglishHints: boolean) {
  const src = en;
  const ui = lang === "km" ? km : en;

  return function t<K extends keyof typeof en>(key: K) {
    const primary = ui[key] ?? src[key];
    if (lang === "km" && includeEnglishHints) {
      const hint = src[key];
      if (hint && hint !== primary) return `${primary}\n\n${hint}`;
    }
    return primary;
  };
}
