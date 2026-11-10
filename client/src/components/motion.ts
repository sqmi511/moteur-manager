import { Variants } from 'framer-motion';

export const listContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.045 } },
};
export const listItem: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};
