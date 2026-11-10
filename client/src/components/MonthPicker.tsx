import { useTranslation } from 'react-i18next';
import { toMonth } from '../utils';

export default function MonthPicker({ value, onChange }: { value: string; onChange: (m: string) => void }) {
  const { i18n } = useTranslation();
  const [y, m] = value.split('-').map(Number);
  const loc = i18n.language === 'ar' ? 'ar-LB-u-nu-latn' : 'en-US';
  const thisYear = new Date().getFullYear();
  const years: number[] = [];
  for (let i = Math.min(thisYear - 5, y); i <= Math.max(thisYear + 1, y); i++) years.push(i);
  const shift = (d: number) => onChange(toMonth(new Date(y, m - 1 + d, 1)));

  return (
    <div className="month-picker no-print">
      <button className="icon-btn flip" onClick={() => shift(-1)} aria-label="Previous month">‹</button>
      <select value={m} onChange={(e) => onChange(`${y}-${String(e.target.value).padStart(2, '0')}`)}>
        {Array.from({ length: 12 }, (_, i) => (
          <option key={i} value={i + 1}>{new Date(2000, i, 1).toLocaleDateString(loc, { month: 'long' })}</option>
        ))}
      </select>
      <select value={y} onChange={(e) => onChange(`${e.target.value}-${String(m).padStart(2, '0')}`)}>
        {years.map((yy) => <option key={yy} value={yy}>{yy}</option>)}
      </select>
      <button className="icon-btn flip" onClick={() => shift(1)} aria-label="Next month">›</button>
    </div>
  );
}
