import { apiRequest } from './client';

export interface ScannerEvent {
  id: string;
  title: string;
  date_time: string;
  location_name?: string;
  cover_photo?: string;
}

export interface ScanResult {
  result: 'success' | 'duplicate' | 'invalid';
  message: string;
  scanned_at?: string;
  used_at?: string;
  ticket?: {
    users?: { first_name: string; last_name: string };
    [key: string]: any;
  };
}

export interface DoormanAssignment {
  user_id: string;
}

export async function getScannerEvents(token: string): Promise<ScannerEvent[]> {
  return apiRequest('/scanner/events', {}, token);
}

export async function scanTicket(token: string, data: { ticket_code: string; event_id: string }): Promise<ScanResult> {
  return apiRequest('/scanner/scan', { method: 'POST', body: JSON.stringify(data) }, token);
}

export async function getDoormenForEvent(token: string, eventId: string): Promise<DoormanAssignment[]> {
  return apiRequest(`/scanner/events/${eventId}/doormen`, {}, token);
}

export async function assignDoormanToEvent(token: string, eventId: string, userId: string): Promise<void> {
  return apiRequest(`/scanner/events/${eventId}/doormen`, {
    method: 'POST',
    body: JSON.stringify({ user_id: userId }),
  }, token);
}

export async function unassignDoormanFromEvent(token: string, eventId: string, userId: string): Promise<void> {
  return apiRequest(`/scanner/events/${eventId}/doormen/${userId}`, {
    method: 'DELETE',
  }, token);
}
