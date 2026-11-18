import * as Contacts from 'expo-contacts/legacy';

import type { ContactInput } from '@/api/hooks';

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
