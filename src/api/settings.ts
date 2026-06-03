import { apiRequest } from './client';

export interface Settings {
  id: string;
  platform_name: string;
  logo_url: string | null;
  logo_url_dark: string | null;
  home_watch_reel_url: string | null;
  currency: string;
  contact_phone_1: string | null;
  contact_phone_label_1: string | null;
  contact_phone_2: string | null;
  contact_phone_label_2: string | null;
  contact_whatsapp: string | null;
  contact_whatsapp_enabled: boolean;
  contact_email: string | null;
  contact_address: string | null;
  footer_instagram_url: string | null;
  // Brand identity (migration 038) — editable from the Brand Identity tab.
  // Same backend code can serve multiple brands by varying these.
  brand_name: string | null;
  brand_website_url: string | null;
  brand_instagram_url: string | null;
  brand_contact_email: string | null;
  ni_merchant_name: string | null;
  ni_brand_logo_url: string | null;
  updated_at: string;
}

export type SettingsUpdate = Partial<Omit<Settings, 'id' | 'updated_at'>>;

export async function getPublicSettings(): Promise<Settings> {
  return apiRequest('/settings/public', {});
}

export async function getSettings(token: string): Promise<Settings> {
  return apiRequest('/settings', {}, token);
}

export async function updateSettings(token: string, data: SettingsUpdate): Promise<Settings> {
  return apiRequest('/settings', { method: 'PUT', body: JSON.stringify(data) }, token);
}
