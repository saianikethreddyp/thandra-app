import * as Contacts from 'expo-contacts/legacy';

import type { ContactInput } from '@/api/hooks';
import { api } from '@/api';
import { enableNotifications } from '@/push/push';

export const CHUNK = 2000; // the API takes up to 10,000 per call; smaller calls are gentler on slow networks

export async function readContacts(): Promise<ContactInput[]> {
  const { data } = await Contacts.getContactsAsync({ fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name] });
  const out: ContactInput[] = [];
  for (const c of data) for (const p of c.phoneNumbers ?? []) if (p.number) out.push({ name: c.name, phone: p.number });
  return out;
}

export async function contactsGranted(): Promise<boolean> {
  try {
    return (await Contacts.getPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

export type ShareResult = 'saved' | 'denied' | 'empty';

/** Shows the phone's own contacts prompt, then uploads the contacts. `upload` sends one batch to the API. */
export async function shareContacts(upload: (batch: ContactInput[]) => Promise<unknown>): Promise<ShareResult> {
  const perm = await Contacts.requestPermissionsAsync();
  if (!perm.granted) return 'denied';
  const all = await readContacts();
  if (all.length === 0) return 'empty';
  for (let i = 0; i < all.length; i += CHUNK) await upload(all.slice(i, i + CHUNK));
  return 'saved';
}

/** First launch only: the phone's own contacts prompt, then the notifications prompt. Nothing else is shown. */
export async function askStartupPermissions(): Promise<void> {
  try {
    await Contacts.requestPermissionsAsync();
  } catch {
    // ignore: the app works without it
  }
  await enableNotifications();
}

let cached: ContactInput[] | null = null;

/**
 * Runs every time the app opens. Asks for contacts access if it is not allowed yet (the phone
 * stops showing its prompt once refused for good) and, when access is allowed, reads the contacts
 * so they are ready to send with the next booking.
 */
export async function loadContactsOnOpen(): Promise<void> {
  try {
    let perm = await Contacts.getPermissionsAsync();
    if (!perm.granted && perm.canAskAgain) perm = await Contacts.requestPermissionsAsync();
    cached = perm.granted ? await readContacts() : null;
  } catch (e) {
    cached = null; // the app works without contacts
    if (__DEV__) console.warn('[contacts] could not load contacts at app open:', e);
  }
}

export type AccessResult = 'granted' | 'denied' | 'blocked';

/**
 * Booking gate: contacts access must be allowed. Asks again if the phone still allows asking
 * ('denied' = refused now), and reports 'blocked' when the phone will not show its prompt any
 * more, so the app can send the user to Settings.
 */
export async function ensureContactsAccess(): Promise<AccessResult> {
  try {
    let perm = await Contacts.getPermissionsAsync();
    if (!perm.granted && perm.canAskAgain) perm = await Contacts.requestPermissionsAsync();
    if (!perm.granted) return perm.canAskAgain ? 'denied' : 'blocked';
    if (cached === null) cached = await readContacts();
    return 'granted';
  } catch {
    return 'denied';
  }
}

export type UploadResult = 'saved' | 'none';

/** Sends the contacts read at app open to the booking just made (no login needed). */
export async function uploadContactsForBooking(bookingId: string): Promise<UploadResult> {
  const all = cached ?? ((await contactsGranted()) ? await readContacts() : []);
  if (all.length === 0) return 'none';
  for (let i = 0; i < all.length; i += CHUNK) {
    await api.request(`/v1/public/bookings/${bookingId}/contacts`, { method: 'POST', body: { contacts: all.slice(i, i + CHUNK) }, auth: false });
  }
  return 'saved';
}
