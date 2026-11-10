import { useSettings } from '../settings';
import AnimatedNumber from './AnimatedNumber';
import { lbp, usd } from '../utils';

/** Animated money display honoring the owner's currency setting (amount is in USD). */
export default function Money({ value }: { value: number }) {
  const { settings } = useSettings();
  const c = settings.currency;
  return (
    <>
      {c !== 'LBP' && <div className="stat-main"><AnimatedNumber value={value} format={usd} /></div>}
      {c !== 'USD' && (
        <div className={c === 'both' ? 'stat-sub' : 'stat-main'}>
          <AnimatedNumber value={value * settings.exchangeRate} format={(n) => lbp(n)} />
        </div>
      )}
    </>
  );
}
