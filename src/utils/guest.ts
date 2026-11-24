import { isValidIndianMobile, toLocalNumber } from './phone';

export type GuestDetails = {
  fullName: string;
  phone: string;
  address: string;
  aadhaar: string;
  licence: string;
};

export type GuestErrors = Partial<Record<keyof GuestDetails, string>>;

export const emptyGuest: GuestDetails = { fullName: '', phone: '', address: '', aadhaar: '', licence: '' };

const squash = (s: string) => s.trim().replace(/\s+/g, ' ');
export const aadhaarDigits = (s: string) => s.replace(/\D/g, '').slice(0, 12);
export const cleanLicence = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20);

/** Shows an Aadhaar number as 1234 5678 9012 while it is typed. */
export const formatAadhaar = (s: string) => aadhaarDigits(s).replace(/(\d{4})(?=\d)/g, '$1 ');

/** Mirrors the API's rules so mistakes are caught before the request is sent. */
export function validateGuest(d: GuestDetails): GuestErrors {
  const e: GuestErrors = {};
  if (squash(d.fullName).length < 2) e.fullName = 'Enter your full name.';
  if (!isValidIndianMobile(d.phone)) e.phone = 'Enter a valid 10-digit mobile number.';
  if (squash(d.address).length < 10) e.address = 'Enter your full address.';
  if (!/^[2-9]\d{11}$/.test(aadhaarDigits(d.aadhaar))) e.aadhaar = 'Enter the 12-digit Aadhaar number.';
  if (!/^[A-Z0-9]{8,20}$/.test(cleanLicence(d.licence))) e.licence = 'Enter your driving licence number.';
  return e;
}

/** The request body the API expects. */
export function toGuestBody(d: GuestDetails) {
  return {
    full_name: squash(d.fullName),
    phone: toLocalNumber(d.phone),
    address: squash(d.address),
    aadhaar: aadhaarDigits(d.aadhaar),
    driving_licence: cleanLicence(d.licence),
  };
}
