export const NAMIBIAN_BANK_CODES = ['FNB', 'BANK_WINDHOEK', 'STANDARD_BANK'] as const;
export type NamibianBankCode = (typeof NAMIBIAN_BANK_CODES)[number];

export function validateNamibianPaymentReference(
  bankCode: string,
  reference: string,
  expectedReference?: string,
): { valid: boolean; message?: string } {
  const code = (bankCode || '').trim().toUpperCase();
  const ref = (reference || '').trim();

  if (!NAMIBIAN_BANK_CODES.includes(code as NamibianBankCode)) {
    return { valid: false, message: 'Select FNB, Bank Windhoek, or Standard Bank Namibia' };
  }
  if (ref.length < 4) {
    return { valid: false, message: 'Payment reference must be at least 4 characters' };
  }
  if (ref.length > 40) {
    return { valid: false, message: 'Payment reference is too long' };
  }
  if (expectedReference && ref.toUpperCase() !== expectedReference.trim().toUpperCase()) {
    return { valid: false, message: 'Reference must match the CRENIT payment reference exactly' };
  }

  switch (code) {
    case 'FNB':
      if (!/^[A-Z0-9\-\/]+$/i.test(ref)) {
        return { valid: false, message: 'FNB references use letters, numbers, hyphens, or slashes only' };
      }
      break;
    case 'BANK_WINDHOEK':
      if (!/^[A-Z0-9\-]+$/i.test(ref)) {
        return { valid: false, message: 'Bank Windhoek references use letters, numbers, and hyphens only' };
      }
      break;
    case 'STANDARD_BANK':
      if (!/^[A-Z0-9]+$/i.test(ref)) {
        return { valid: false, message: 'Standard Bank references use letters and numbers only' };
      }
      break;
  }

  return { valid: true };
}
