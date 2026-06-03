export interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  age: number;
  role: string;
  status: 'active' | 'inactive';
  created_at: string;
}

export interface Tier {
  id: string;
  event_id: string;
  name: string;
  price: number;
  total_quantity: number;
  available_quantity: number;
  seats_per_row?: number;
  row_label_start?: string | null;
  venue_tier_key?: string | null;
  selection_mode?: 'assigned' | 'general_admission';
}

export interface Sponsor {
  id: string;
  sponsor_name: string;
  logo?: string;
}

export type PromoDiscountType = 'percent' | 'fixed';

export interface PromoCode {
  id: string;
  code: string;
  discount_type: PromoDiscountType;
  discount_percent: number;
  discount_amount: number | null;
  usage_limit: number | null;
  used_count: number;
  starts_at: string | null;
  expires_at: string | null;
  event_id: string | null;
  applicable_currencies: string[];
  active: boolean;
  created_at: string;
  updated_at: string;
  events?: { id: string; title: string } | null;
}

export interface SocialLinks {
  instagram?: string;
  facebook?: string;
  twitter?: string;
  tiktok?: string;
}

export interface Event {
  id: string;
  title: string;
  slug?: string;
  subtitle?: string;
  date_time: string;
  end_date_and_time?: string | null;
  age_restriction?: number | null;
  location_name: string;
  full_address?: string;
  location_lat?: number;
  location_lng?: number;
  map_embed_url?: string;
  parking_info?: string;
  description?: string;
  cover_photo?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  visibility?: 'public' | 'unlisted' | 'private';
  sales_start_date?: string;
  sales_end_date?: string;
  max_tickets_per_order?: number;
  created_by: string;
  created_at: string;
  venue_template_id?: string | null;
  tiers: Tier[];
  sponsors: Sponsor[];
}

export interface Seat {
  id: string;
  tier_id: string;
  event_id: string;
  seat_number: string;
  status: 'available' | 'locked' | 'booked';
  created_at: string;
}

export interface ReservationItem {
  id: string;
  reservation_id: string;
  seat_id: string;
  tier_id: string;
  price: number;
}

export interface Reservation {
  id: string;
  user_id: string;
  event_id: string;
  payment_status: 'pending' | 'paid' | 'cancelled' | 'failed' | 'refunded' | 'expired';
  payment_reference?: string;
  total_amount: number;
  reference_number: number;
  created_at: string;
  reservation_items: ReservationItem[];
}

export interface Ticket {
  id: string;
  reservation_id: string;
  event_id: string;
  user_id: string;
  ticket_code: string;
  status: 'valid' | 'used' | 'cancelled';
  created_at: string;
}

export interface WaitlistEntry {
  id: string;
  user_id: string;
  event_id: string;
  position: number;
  created_at: string;
  user?: Pick<User, 'first_name' | 'last_name' | 'email'>;
}

export interface AnalyticsStats {
  total_page_views: { count: number | null; change: number | null };
  new_users: { count: number; change: number };
  events_hosted: { count: number; change: number };
  conversion_rate: { rate: number; change: number };
}

export interface RevenueTrendPoint {
  month: string;
  revenue: number;
  ticket_sales: number;
}

export interface AgeDemographicPoint {
  range: string;
  count: number;
  percentage: number;
}

export interface EventPerformanceRow {
  event_id: string;
  title: string;
  tickets_sold: number;
  revenue: number;
  seats_remaining?: number;
}

export interface AnalyticsData {
  stats: AnalyticsStats;
  revenue_trend: RevenueTrendPoint[];
  age_demographics: AgeDemographicPoint[];
  events_breakdown?: EventPerformanceRow[];
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

export type RoleResource =
  | 'overview'
  | 'events' | 'reservations' | 'payments' | 'venues'
  | 'incomplete_payments' | 'users' | 'suppliers'
  | 'analytics' | 'scanner' | 'settings'
  | 'messages' | 'newsletter' | 'promo_codes';

export type RolePermissionMatrix = Record<string, Record<RoleResource, boolean>>;

export interface MyPermissions {
  role: string;
  resources: RoleResource[];
}

export interface ActivityLogUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

export interface ActivityLog {
  id: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
  user: ActivityLogUser | null;
}

export interface UserStats {
  total_customers: number;
  admins_and_managers: number;
  door_scanners: number;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}
