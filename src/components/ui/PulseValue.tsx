import { useEffect, useRef, useState } from 'react';

interface Props {
  value: string | number;
  className?: string;
}

export default function PulseValue({ value, className = '' }: Props) {
  const [animKey, setAnimKey] = useState(0);
  const prevRef = useRef<string | number | undefined>(undefined);

  useEffect(() => {
    if (prevRef.current !== undefined && prevRef.current !== value) {
      setAnimKey(k => k + 1);
    }
    prevRef.current = value;
  }, [value]);

  return (
    <span
      key={animKey}
      className={`${animKey > 0 ? 'value--pulse' : ''} ${className}`}
    >
      {value}
    </span>
  );
}
