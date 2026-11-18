/** Keeps digits only and drops a leading +91 / 91 / 0, so the result is the 10-digit mobile number. */
export function toLocalNumber(input: string): string {
  let d = input.replace(/\D/g, '');
  if (d.length > 10 && d.startsWith('91')) d = d.slice(2);
  if (d.length > 10 && d.startsWith('0')) d = d.slice(1);
  return d.slice(0, 10);
}

export const isValidIndianMobile = (input: string) => /^[6-9]\d{9}$/.test(toLocalNumber(input));

/** What the API receives. It normalises further, so a plain 10-digit number is enough. */
export const toApiPhone = (input: string) => toLocalNumber(input);

export const maskPhone = (phone: string) => {
  const d = toLocalNumber(phone);
  return d.length === 10 ? `+91 ${d.slice(0, 2)}•••••${d.slice(7)}` : phone;
};
