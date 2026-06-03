import { apiRequest } from './client';
import { getValidAccessToken, refreshAccessToken } from '../auth/authSession';

const API_URL = import.meta.env.VITE_API_URL as string;

async function fetchPdfWithAuth(path: string, token?: string): Promise<Response> {
  const authToken = token ?? (await getValidAccessToken());
  const res = await fetch(path, {
    headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
  });
  if (res.status === 401 && !token) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return fetch(path, { headers: { Authorization: `Bearer ${newToken}` } });
    }
  }
  return res;
}

/** Download ticket PDF for a paid reservation (admin). */
export async function downloadAdminReservationTicketsPdf(
  token: string,
  reservationId: string,
): Promise<{ blob: Blob; filename: string }> {
  const res = await fetchPdfWithAuth(
    `${API_URL}/reservations/${reservationId}/tickets.pdf`,
    token,
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || 'Download failed');
  }
  const blob = await res.blob();
  const disposition = res.headers.get('Content-Disposition') || '';
  const match = disposition.match(/filename="?([^"]+)"?/i);
  const filename = match?.[1] || `tickets-${reservationId.slice(0, 8)}.pdf`;
  return { blob, filename };
}

/** Same PDF ticket email as after purchase (worker `send-tickets`); envelope = buyer account email. */
export async function resendTicketPdfEmail(
  token: string,
  reservationId: string
): Promise<{ ok: boolean; message: string }> {
  return apiRequest('/tickets/resend-email', {
    method: 'POST',
    body: JSON.stringify({ reservation_id: reservationId }),
  }, token);
}
