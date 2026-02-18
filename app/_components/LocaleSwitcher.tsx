import type { AppLocale } from "../_lib/i18n";
import { t } from "../_lib/i18n";

type LocaleSwitcherProps = {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
};

export function LocaleSwitcher({ locale, setLocale }: LocaleSwitcherProps) {
  return (
    <label className="locale-switcher" aria-label={t(locale, "locale_label") }>
      <span>{t(locale, "locale_label")}</span>
      <select value={locale} onChange={(e) => setLocale(e.target.value as AppLocale)}>
        <option value="en">{t(locale, "locale_en")}</option>
        <option value="ja">{t(locale, "locale_ja")}</option>
        <option value="zh">{t(locale, "locale_zh")}</option>
      </select>
    </label>
  );
}
