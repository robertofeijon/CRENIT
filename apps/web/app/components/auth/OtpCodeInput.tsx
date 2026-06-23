'use client';

import { useEffect, useRef } from 'react';

type OtpCodeInputProps = {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  disabled?: boolean;
};

export default function OtpCodeInput({ value, onChange, length = 6, disabled }: OtpCodeInputProps) {
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const digits = value.padEnd(length, ' ').slice(0, length).split('');

  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  const setDigit = (index: number, digit: string) => {
    const clean = digit.replace(/\D/g, '').slice(-1);
    const next = digits.map((d, i) => (i === index ? clean : d === ' ' ? '' : d)).join('').slice(0, length);
    onChange(next.replace(/\s/g, ''));
    if (clean && index < length - 1) inputsRef.current[index + 1]?.focus();
  };

  const onKeyDown = (index: number, key: string) => {
    if (key === 'Backspace' && !digits[index]?.trim() && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const onPaste = (text: string) => {
    const clean = text.replace(/\D/g, '').slice(0, length);
    onChange(clean);
    const focusIndex = Math.min(clean.length, length - 1);
    inputsRef.current[focusIndex]?.focus();
  };

  return (
    <div className="otp-input-group" role="group" aria-label="Verification code">
      {Array.from({ length }).map((_, index) => (
        <input
          key={index}
          ref={(el) => {
            inputsRef.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          disabled={disabled}
          value={digits[index]?.trim() ? digits[index] : ''}
          className="otp-digit"
          onChange={(e) => setDigit(index, e.target.value)}
          onKeyDown={(e) => onKeyDown(index, e.key)}
          onPaste={(e) => {
            e.preventDefault();
            onPaste(e.clipboardData.getData('text'));
          }}
        />
      ))}
    </div>
  );
}
