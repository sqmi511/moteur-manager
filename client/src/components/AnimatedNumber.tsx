import { useEffect, useRef, useState } from 'react';
import { animate } from 'framer-motion';

interface Props { value: number; format?: (n: number) => string; duration?: number }

export default function AnimatedNumber({ value, format, duration = 0.9 }: Props) {
  const fmt = useRef(format);
  fmt.current = format;
  const from = useRef(0);
  const render = (n: number) => (fmt.current ? fmt.current(n) : Math.round(n).toLocaleString('en-US'));
  const [text, setText] = useState(() => render(0));

  useEffect(() => {
    const ctrl = animate(from.current, value, {
      duration,
      ease: 'easeOut',
      onUpdate: (v) => { from.current = v; setText(render(v)); },
    });
    return () => ctrl.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return <span className="num">{text}</span>;
}
