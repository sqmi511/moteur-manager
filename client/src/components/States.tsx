import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import Button from './Button';

export function Loading({ label }: { label?: string }) {
  const { t } = useTranslation();
  return (
    <div className="state">
      <span className="spinner spinner-lg" />
      <p>{label ?? t('common.loading')}</p>
    </div>
  );
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <motion.div className="state" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}>
      <div className="state-icon">⚡</div>
      <h4>{title}</h4>
      {hint && <p>{hint}</p>}
      {action}
    </motion.div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="state state-error" role="alert">
      <div className="state-icon">!</div>
      <h4>{t('common.error')}</h4>
      <p>{message}</p>
      {onRetry && <Button variant="soft" onClick={onRetry}>{t('common.retry')}</Button>}
    </div>
  );
}

export function StatusBadge({ status }: { status: 'paid' | 'partial' | 'unpaid' }) {
  const { t } = useTranslation();
  return <span className={`badge badge-${status}`}>{t(`status.${status}`)}</span>;
}
