import { apiRequest } from './client';

export interface IssueComplimentaryPayload {
  seat_ids: string[];
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  note?: string;
  send_email?: boolean;
}

export interface IssueComplimentaryResult {
  reservation: {
    id: string;
    reference_number?: number | null;
    total_amount: number;
    payment_status: string;
    is_complimentary?: boolean;
  };
  guest: {
    id: string;
    email: string;
    first_name?: string | null;
    last_name?: string | null;
  };
  tickets_count: number;
}

export async function issueComplimentaryReservations(
  token: string,
  eventId: string,
  payload: IssueComplimentaryPayload,
): Promise<IssueComplimentaryResult> {
  return apiRequest(
    `/admin/events/${eventId}/complimentary-reservations`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    token,
  );
}
