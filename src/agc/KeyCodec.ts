export type AgcKey = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' |
  'VERB' | 'NOUN' | 'PLUS' | 'MINUS' | 'ENTR' | 'CLR' | 'PRO' | 'KEY_REL' | 'RSET';

// Five-bit main-DSKY codes; PRO is a held signal on channel 032, bit 14.
export const keyCodes: Readonly<Partial<Record<AgcKey, number>>> = {
  '0': 0o20, '1': 0o1, '2': 0o2, '3': 0o3, '4': 0o4,
  '5': 0o5, '6': 0o6, '7': 0o7, '8': 0o10, '9': 0o11,
  VERB: 0o21, NOUN: 0o37, PLUS: 0o32, MINUS: 0o33,
  ENTR: 0o34, CLR: 0o36, KEY_REL: 0o31, RSET: 0o22,
};

export function isAgcKey(value: string): value is AgcKey {
  return value in keyCodes || value === 'PRO';
}
