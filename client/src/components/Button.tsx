import { ReactNode } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

type Props = Omit<HTMLMotionProps<'button'>, 'children'> & {
  children?: ReactNode;
  variant?: 'primary' | 'ghost' | 'danger' | 'soft';
  size?: 'sm' | 'md';
  loading?: boolean;
};

export default function Button({ variant = 'primary', size = 'md', loading, disabled, className = '', children, ...rest }: Props) {
  const off = disabled || loading;
  return (
    <motion.button
      type="button"
      whileHover={off ? undefined : { scale: 1.03 }}
      whileTap={off ? undefined : { scale: 0.94 }}
      transition={{ type: 'spring', stiffness: 500, damping: 22 }}
      className={`btn btn-${variant} btn-${size} ${className}`}
      disabled={off}
      {...rest}
    >
      {loading && <span className="spinner" />}
      {children}
    </motion.button>
  );
}
