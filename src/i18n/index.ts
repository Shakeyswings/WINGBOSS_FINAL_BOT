import en from "./en.ts";
import km from "./km.ts";

type Dict = typeof en;

export function buildTranslator(defaultLang: "en"|"km", includeEnglishHints: boolean) {
  const dict = defaultLang === "km" ? km : en;
  return {
    lang: defaultLang,
    t(key: keyof Dict) { return dict[key] ?? en[key] ?? String(key); },
    hint(kmText: string, enText: string) {
      if (defaultLang === "km" && includeEnglishHints) return `${kmText}\n${enText}`;
      return defaultLang === "km" ? kmText : enText;
    }
  };
}
