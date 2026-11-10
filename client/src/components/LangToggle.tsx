import { useTranslation } from 'react-i18next';

export default function LangToggle() {
  const { i18n } = useTranslation();
  const ar = i18n.language === 'ar';
  return (
    <button className="lang-toggle" onClick={() => i18n.changeLanguage(ar ? 'en' : 'ar')} aria-label="Language">
      <span className={!ar ? 'on' : ''}>EN</span>
      <span className={ar ? 'on' : ''}>عربي</span>
    </button>
  );
}
