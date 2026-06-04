import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Image as ImageIcon,
  MapPin,
  Calendar,
  Ticket,
  Users,
  Settings,
  Save,
  Eye,
  CheckCircle,
  Plus,
} from "lucide-react";
import {
  useEvent,
  useCreateEvent,
  useUpdateEvent,
  useUploadCoverPhoto,
  useUpdateTier,
  useDeleteTier,
} from '../../../hooks/useEvents';
import { useSponsors } from '../../../hooks/useSponsors';
import { batchCreateTiers, getEventVenueSeatingSync, provisionEventVenue } from '../../../api/events';
import { listVenueTemplates } from '../../../api/venueTemplates';
import { useAuth } from '../../components/AuthProvider';
import { useQueryClient } from '@tanstack/react-query';
import { normalizeEventVisibility } from '../../utils/eventVisibility';
import { useLanguage } from '../../contexts/LanguageContext';
import { getUserFacingErrorMessage } from '../../../utils/userFacingError';
import { fromDatetimeLocalValue, toDatetimeLocalValue } from '../../utils/eventSchedule';
import { PhoneCountryField } from '../../components/PhoneCountryField';
import { COUNTRY_DIAL_CODES, getCountryByIso } from '../../data/countryDialCodes';
import {
  isValidNationalPhone,
  parseE164ToForm,
  phoneFormToE164,
} from '../../utils/phoneValidation';

const TABS = [
  { id: 'basic', label: 'Basic Info', icon: Calendar },
  { id: 'media', label: 'Photos & Media', icon: ImageIcon },
  { id: 'tickets', label: 'Tickets & Pricing', icon: Ticket },
  { id: 'location', label: 'Location & Map', icon: MapPin },
  { id: 'contact', label: 'Contact', icon: Users },
  { id: 'settings', label: 'Settings & Publish', icon: Settings },
];

type TierItem = {
  id: string | number;
  name: string;
  price: number;
  seats: number;
  seatsPerRow: number;
  rowLabelStart: string;
  saved?: boolean;
  modified?: boolean;
};

function tierToApiPayload(t: TierItem): { name: string; price: number; total_quantity: number; seats_per_row: number; row_label_start?: string | null } {
  const seats_per_row = Math.max(1, Number(t.seatsPerRow) || 10);
  const row = String(t.rowLabelStart || '').trim();
  return {
    name: t.name,
    price: t.price,
    total_quantity: t.seats,
    seats_per_row,
    row_label_start: row.length ? row.charAt(0).toUpperCase() : null,
  };
}

export function AdminEventEditor() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState('basic');

  // Basic Info
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [endDateTime, setEndDateTime] = useState('');
  const [ageRestriction, setAgeRestriction] = useState('');
  const [description, setDescription] = useState('');
  const [selectedSponsors, setSelectedSponsors] = useState<string[]>([]);

  // Location
  const [location, setLocation] = useState('');
  const [fullAddress, setFullAddress] = useState('');
  const [locationLat, setLocationLat] = useState('');
  const [locationLng, setLocationLng] = useState('');
  const [mapEmbedUrl, setMapEmbedUrl] = useState('');
  const [parkingInfo, setParkingInfo] = useState('');

  // Contact
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhoneCountryIso, setContactPhoneCountryIso] = useState('JO');
  const [contactPhoneNational, setContactPhoneNational] = useState('');
  const [contactPhoneInvalid, setContactPhoneInvalid] = useState(false);

  // Settings
  const [visibility, setVisibility] = useState<'public' | 'unlisted'>('public');
  const [salesStartDate, setSalesStartDate] = useState('');
  const [salesEndDate, setSalesEndDate] = useState('');
  const [maxTicketsPerOrder, setMaxTicketsPerOrder] = useState('10');
  // Tiers
  const [tiers, setTiers] = useState<TierItem[]>([
    { id: 1, name: 'General Admission', price: 25, seats: 500, seatsPerRow: 10, rowLabelStart: '', saved: false }
  ]);

  const [venueTemplateId, setVenueTemplateId] = useState<string>('');
  const [venueTierPrices, setVenueTierPrices] = useState<Record<string, number>>({
    balcony_left: 25,
    balcony_right: 25,
    vvip: 150,
    vip: 75,
    regular: 15,
  });
  const [provisioning, setProvisioning] = useState(false);

  const { token } = useAuth();
  const qc = useQueryClient();

  const { data: venueTemplatesData } = useQuery({
    queryKey: ['venue-templates'],
    queryFn: () => listVenueTemplates(token!),
    enabled: Boolean(token),
  });
  const venueTemplates = venueTemplatesData?.data ?? [];
  const usesVenueTemplate = Boolean(venueTemplateId);

  const { data: venueSeatingSync } = useQuery({
    queryKey: ['venue-seating-sync', id],
    queryFn: () => getEventVenueSeatingSync(token!, id!),
    enabled: Boolean(token && id && isEditMode && venueTemplateId),
  });
  const { data: event } = useEvent(id);
  const { data: sponsorsData } = useSponsors({ limit: 100 });
  const sponsors = [...new Map((sponsorsData?.data ?? []).map(s => [s.id, s])).values()];

  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const uploadCoverPhoto = useUploadCoverPhoto();
  const updateTierMutation = useUpdateTier();
  const deleteTierMutation = useDeleteTier();

  const batchCreateTiersMutation = useMutation({
    mutationFn: ({ eventId, tiers: tierList }: { eventId: string; tiers: ReturnType<typeof tierToApiPayload>[] }) =>
      batchCreateTiers(token!, eventId, tierList),
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  /** After "Add tier", scroll this tier's card into view (mobile / long pages). */
  const scrollNewTierIdRef = useRef<string | number | null>(null);

  useLayoutEffect(() => {
    const id = scrollNewTierIdRef.current;
    if (id == null) return;
    const run = () => {
      const el = document.getElementById(`admin-tier-card-${id}`);
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
      scrollNewTierIdRef.current = null;
    };
    requestAnimationFrame(() => requestAnimationFrame(run));
  }, [tiers]);

  useEffect(() => {
    if (!event) return;
    setName(event.title ?? '');
    setSlug(event.slug ?? '');
    setSubtitle(event.subtitle ?? '');
    setDateTime(toDatetimeLocalValue(event.date_time));
    setEndDateTime(toDatetimeLocalValue(event.end_date_and_time));
    setAgeRestriction(event.age_restriction != null ? String(event.age_restriction) : '');
    setDescription(event.description ?? '');
    setSelectedSponsors([...new Set(event.sponsors.map(s => s.id))]);
    setLocation(event.location_name ?? '');
    setFullAddress(event.full_address ?? '');
    setLocationLat(event.location_lat != null ? String(event.location_lat) : '');
    setLocationLng(event.location_lng != null ? String(event.location_lng) : '');
    setMapEmbedUrl(event.map_embed_url ?? '');
    setParkingInfo(event.parking_info ?? '');
    setContactName(event.contact_name ?? '');
    setContactEmail(event.contact_email ?? '');
    const parsedContactPhone = parseE164ToForm(event.contact_phone);
    setContactPhoneCountryIso(parsedContactPhone.phoneCountryIso);
    setContactPhoneNational(parsedContactPhone.phoneNational);
    setContactPhoneInvalid(false);
    setVisibility(normalizeEventVisibility(event.visibility));
    setSalesStartDate(toDatetimeLocalValue(event.sales_start_date));
    setSalesEndDate(toDatetimeLocalValue(event.sales_end_date));
    setMaxTicketsPerOrder(event.max_tickets_per_order != null ? String(event.max_tickets_per_order) : '10');
    setVenueTemplateId(event.venue_template_id ?? '');
    if (event.venue_template_id && event.tiers?.length) {
      const prices: Record<string, number> = { ...venueTierPrices };
      for (const t of event.tiers) {
        if (t.venue_tier_key) prices[t.venue_tier_key] = t.price;
      }
      setVenueTierPrices(prices);
    }
    setTiers(event.tiers.map(t => ({
      id: t.id,
      name: t.name,
      price: t.price,
      seats: t.total_quantity,
      seatsPerRow: t.seats_per_row ?? 10,
      rowLabelStart: t.row_label_start ?? '',
      saved: true,
    })));
  }, [event]);

  const resolveContactPhoneE164 = (): string | undefined => {
    const national = contactPhoneNational.trim();
    if (!national) return undefined;
    if (!isValidNationalPhone(national)) {
      setContactPhoneInvalid(true);
      toast.error(t('validation.phoneNationalTenDigits'));
      throw new Error('invalid phone');
    }
    const e164 = phoneFormToE164(contactPhoneCountryIso, national);
    if (!e164) {
      setContactPhoneInvalid(true);
      toast.error(t('validation.phoneNationalTenDigits'));
      throw new Error('invalid phone');
    }
    setContactPhoneInvalid(false);
    return e164;
  };

  const buildPayload = (contactPhoneE164?: string) => ({
    title: name,
    slug: slug.trim() || undefined,
    subtitle: subtitle || undefined,
    date_time: fromDatetimeLocalValue(dateTime),
    end_date_and_time: endDateTime ? fromDatetimeLocalValue(endDateTime) : null,
    age_restriction: ageRestriction ? parseInt(ageRestriction, 10) : null,
    location_name: location,
    full_address: fullAddress || undefined,
    location_lat: locationLat ? parseFloat(locationLat) : undefined,
    location_lng: locationLng ? parseFloat(locationLng) : undefined,
    map_embed_url: mapEmbedUrl || undefined,
    parking_info: parkingInfo || undefined,
    description: description || undefined,
    contact_name: contactName || undefined,
    contact_email: contactEmail || undefined,
    contact_phone: contactPhoneE164,
    visibility,
    sales_start_date: salesStartDate ? fromDatetimeLocalValue(salesStartDate) : undefined,
    sales_end_date: salesEndDate ? fromDatetimeLocalValue(salesEndDate) : undefined,
    max_tickets_per_order: maxTicketsPerOrder ? parseInt(maxTicketsPerOrder) : undefined,
    sponsors: selectedSponsors,
    venue_template_id: venueTemplateId || null,
  });

  const runProvisionVenue = async (eventId: string, force = false) => {
    if (!venueTemplateId || !token) return;
    setProvisioning(true);
    try {
      const result = await provisionEventVenue(token, eventId, {
        template_id: venueTemplateId,
        tier_prices: venueTierPrices,
        force,
      });
      await qc.invalidateQueries({ queryKey: ['event', eventId] });
      await qc.invalidateQueries({ queryKey: ['venue-seating-sync', eventId] });
      if (result.skipped) {
        const onEvent = result.map_seat_count ?? 0;
        const onTemplate = result.template_layout_seat_count;
        const templateHint =
          onEvent === 0 && onTemplate != null && onTemplate > 0
            ? ` Template has ${onTemplate} seats — use Re-provision to copy them onto this event.`
            : onEvent === 0
              ? ' Save seats on the venue map (Admin → Venues) first.'
              : '';
        toast.message(
          `Seating already provisioned (${onEvent} map seats on event).${templateHint}`,
        );
        return;
      }
      const mapCount = result.map_seat_count ?? 0;
      const released =
        result.released_locks && result.released_locks > 0
          ? ` · cleared ${result.released_locks} stale seat lock(s)`
          : '';
      if (mapCount === 0) {
        toast.error(
          `No map seats were created. Open Admin → Venues, place seats on the floor plan, Save map, then Re-provision.`,
        );
        return;
      }
      if (result.incremental) {
        const parts: string[] = [];
        if (result.seats_added) parts.push(`+${result.seats_added} seat(s)`);
        if (result.seats_removed) parts.push(`−${result.seats_removed} seat(s)`);
        if (result.coords_updated) parts.push(`${result.coords_updated} position(s) updated`);
        const detail = parts.length ? ` (${parts.join(', ')})` : '';
        toast.success(`Seating synced with template (${mapCount} map seats)${detail}${released}`);
      } else {
        toast.success(`Seating provisioned (${mapCount} map seats)${released}`);
      }
    } catch (e: unknown) {
      toast.error(getUserFacingErrorMessage(e, 'Could not provision seats'));
    } finally {
      setProvisioning(false);
    }
  };

  const handleSave = () => save();
  const handlePublish = async () => {
    if (isEditMode) {
      try {
        await updateEvent.mutateAsync({ id: id!, data: { visibility: 'public' } });
        setVisibility('public');
        await qc.invalidateQueries({ queryKey: ['event', id] });
        toast.success('Event published');
      } catch (e: unknown) {
        toast.error(getUserFacingErrorMessage(e, 'Could not publish event'));
      }
    } else {
      await save({ visibility: 'public' });
    }
  };

  const save = async (overrides?: { visibility?: 'public' | 'unlisted' }) => {
    if (!dateTime) {
      toast.error('Start date and time is required');
      return;
    }
    if (endDateTime && new Date(endDateTime).getTime() <= new Date(dateTime).getTime()) {
      toast.error('End date and time must be after the start');
      return;
    }
    let contactPhoneE164: string | undefined;
    try {
      contactPhoneE164 = resolveContactPhoneE164();
    } catch {
      return;
    }
    const payload = { ...buildPayload(contactPhoneE164), ...overrides };
    try {
      if (isEditMode) {
        await updateEvent.mutateAsync({ id: id!, data: payload });

        if (!venueTemplateId) {
          const unsavedTiers = tiers.filter(t => !t.saved);
          const modifiedTiers = tiers.filter(t => t.saved && t.modified);

          await Promise.all(
            modifiedTiers.map(t =>
              updateTierMutation.mutateAsync({
                eventId: id!,
                tierId: String(t.id),
                data: tierToApiPayload(t),
              })
            )
          );

          if (unsavedTiers.length > 0) {
            await batchCreateTiersMutation.mutateAsync({
              eventId: id!,
              tiers: unsavedTiers.map(tierToApiPayload),
            });
          }
        }

        await qc.invalidateQueries({ queryKey: ['event', id] });
        if (venueTemplateId) {
          await qc.invalidateQueries({ queryKey: ['venue-seating-sync', id] });
          const hasVenueTiers = event?.tiers?.some((t) => t.venue_tier_key);
          if (hasVenueTiers) {
            await Promise.all(
              (event?.tiers ?? [])
                .filter((t) => t.venue_tier_key && venueTierPrices[t.venue_tier_key] != null)
                .map((t) =>
                  updateTierMutation.mutateAsync({
                    eventId: id!,
                    tierId: t.id,
                    data: { price: venueTierPrices[t.venue_tier_key!] },
                  }),
                ),
            );
          } else {
            await runProvisionVenue(id!, false);
          }
        }
        toast.success('Event updated');
      } else {
        const created = await createEvent.mutateAsync(payload);
        if (venueTemplateId) {
          await runProvisionVenue(created.id, true);
        } else {
          const unsavedTiers = tiers.filter(t => !t.saved);
          if (unsavedTiers.length > 0) {
            await batchCreateTiersMutation.mutateAsync({
              eventId: created.id,
              tiers: unsavedTiers.map(tierToApiPayload),
            });
          }
        }
        toast.success('Event saved');
        navigate('/events');
      }
    } catch (e: unknown) {
      toast.error(getUserFacingErrorMessage(e, 'Could not save event'));
    }
  };

  const handleAddTier = () => {
    const newId = Date.now();
    scrollNewTierIdRef.current = newId;
    setTiers((prev) => [
      ...prev,
      {
        id: newId,
        name: "",
        price: 0,
        seats: 0,
        seatsPerRow: 10,
        rowLabelStart: "",
        saved: false,
      },
    ]);
  };

  const handleRemoveTier = (tier: TierItem) => {
    if (tier.saved && id) {
      deleteTierMutation.mutate(
        { eventId: id, tierId: String(tier.id) },
        {
          onSuccess: () => setTiers(prev => prev.filter(t => t.id !== tier.id)),
          onError: (e: unknown) => toast.error(getUserFacingErrorMessage(e, 'Could not delete tier')),
        }
      );
    } else {
      setTiers(prev => prev.filter(t => t.id !== tier.id));
    }
  };

  const isSaving = createEvent.isPending || updateEvent.isPending || updateTierMutation.isPending || batchCreateTiersMutation.isPending;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-6 rounded-xl shadow-[0_8px_24px_rgba(20,14,8,0.04)] border border-border sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Link to="/events" className="w-10 h-10 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <ArrowLeft size={20} className="rtl:rotate-180" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold font-['Tajawal'] text-foreground">
              {isEditMode ? 'Edit Event' : 'Create New Event'}
            </h1>
            <div className="flex items-center text-sm text-muted-foreground mt-1 gap-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-bold uppercase">Draft</span>
              <span>Unsaved changes</span>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-secondary transition-colors flex items-center gap-2 disabled:opacity-60"
          >
            <Save size={16} />
            {isSaving ? 'Saving…' : 'Save Event'}
          </button>
          <button
            onClick={handlePublish}
            disabled={isSaving}
            className="px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-accent transition-colors flex items-center gap-2 disabled:opacity-60"
          >
            <CheckCircle size={16} />
            Publish
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Nav */}
        <div className="lg:col-span-1 space-y-1 bg-card p-4 rounded-xl border border-border">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-start ${
                  isActive
                    ? "bg-muted text-foreground font-medium"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                }`}
              >
                <Icon size={18} className={isActive ? "text-foreground" : "text-muted-foreground"} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Editor Area */}
        <div className="lg:col-span-3">
          <div className="bg-card rounded-xl shadow-[0_8px_24px_rgba(20,14,8,0.04)] border border-border overflow-hidden">
            <div className="p-6 border-b border-border">
              <h2 className="text-xl font-bold font-['Tajawal'] text-foreground">
                {TABS.find(t => t.id === activeTab)?.label}
              </h2>
            </div>

            <div className="p-6 space-y-6">
              {activeTab === 'basic' && (
                <>
                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-foreground">Event Title <span className="text-muted-foreground">*</span></label>
                    <input
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="e.g. Desert Soundscapes"
                      className="w-full bg-muted border border-transparent rounded-lg py-3 px-4 text-base focus:bg-card focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-foreground">URL slug</label>
                    <input
                      type="text"
                      value={slug}
                      onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      placeholder="auto from title if left empty on create"
                      className="w-full bg-muted border border-transparent rounded-lg py-3 px-4 text-base focus:bg-card focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">Public link: /event/your-slug — lowercase letters, numbers, hyphens.</p>
                  </div>

                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-foreground">Subtitle / Artist Lineup</label>
                    <input
                      type="text"
                      value={subtitle}
                      onChange={e => setSubtitle(e.target.value)}
                      placeholder="e.g. Featuring DJ Snake and local artists"
                      className="w-full bg-muted border border-transparent rounded-lg py-3 px-4 text-base focus:bg-card focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <label className="block text-sm font-medium text-foreground">Start date & time <span className="text-muted-foreground">*</span></label>
                      <input
                        type="datetime-local"
                        value={dateTime}
                        onChange={e => setDateTime(e.target.value)}
                        className="w-full bg-muted border border-transparent rounded-lg py-3 px-4 text-base focus:bg-card focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-4">
                      <label className="block text-sm font-medium text-foreground">End date & time</label>
                      <input
                        type="datetime-local"
                        value={endDateTime}
                        min={dateTime || undefined}
                        onChange={e => setEndDateTime(e.target.value)}
                        className="w-full bg-muted border border-transparent rounded-lg py-3 px-4 text-base focus:bg-card focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      />
                      <p className="text-xs text-muted-foreground">Optional. Leave empty if the event has no fixed end time.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <label className="block text-sm font-medium text-foreground">Age Restriction</label>
                      <select
                        value={ageRestriction}
                        onChange={e => setAgeRestriction(e.target.value)}
                        className="w-full bg-muted border border-transparent rounded-lg py-3 px-4 text-base focus:bg-card focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      >
                        <option value="">All Ages</option>
                        <option value="12">12+</option>
                        <option value="16">16+</option>
                        <option value="18">18+</option>
                        <option value="21">21+</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-foreground">Description</label>
                    <textarea
                      rows={6}
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder="Write a compelling description for the event..."
                      className="w-full bg-muted border border-transparent rounded-lg py-3 px-4 text-base focus:bg-card focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none"
                    ></textarea>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-medium text-foreground">Event Sponsors</label>
                      <span className="text-xs text-muted-foreground">{selectedSponsors.length} selected</span>
                    </div>
                    <div className="border border-border rounded-xl p-4 bg-card max-h-64 overflow-y-auto">
                      <div className="space-y-3">
                        {sponsors.map((sponsor) => {
                          const isSelected = selectedSponsors.includes(sponsor.id);
                          return (
                            <label
                              key={sponsor.id}
                              className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                                isSelected ? 'bg-muted border border-black' : 'border border-border hover:bg-muted/50'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedSponsors([...selectedSponsors, sponsor.id]);
                                  } else {
                                    setSelectedSponsors(selectedSponsors.filter(sid => sid !== sponsor.id));
                                  }
                                }}
                                className="w-5 h-5 rounded border-[#8c8c8c] text-foreground focus:ring-primary"
                              />
                              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                                {sponsor.logo ? (
                                  <img src={sponsor.logo} alt={sponsor.sponsor_name} className="w-full h-full object-cover" />
                                ) : (
                                  <ImageIcon className="w-5 h-5 text-muted-foreground" />
                                )}
                              </div>
                              <span className="font-medium text-foreground">{sponsor.sponsor_name}</span>
                            </label>
                          );
                        })}
                        {sponsors.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-4">No sponsors available</p>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Select sponsors that will be providing services for this event. You can manage sponsors from the <a href="/sponsors" className="text-foreground hover:underline">Sponsors page</a>.
                    </p>
                  </div>
                </>
              )}

              {activeTab === 'media' && (
                <>
                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-foreground">Cover Photo <span className="text-muted-foreground">*</span></label>
                    <div
                      className="border-2 border-dashed border-border rounded-xl p-12 flex flex-col items-center justify-center text-center bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {event?.cover_photo ? (
                        <img
                          src={event.cover_photo}
                          alt="Cover"
                          className="w-full max-h-48 object-cover rounded-lg mb-4"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-card flex items-center justify-center text-foreground shadow-sm mb-4">
                          <ImageIcon size={28} />
                        </div>
                      )}
                      <h4 className="text-foreground font-medium text-lg mb-1">Click to upload or drag and drop</h4>
                      <p className="text-muted-foreground text-sm">SVG, PNG, JPG or WebP (max. 5MB)</p>
                      <p className="text-muted-foreground text-xs mt-2">Recommended: 1920x1080px (16:9 ratio)</p>
                      {!isEditMode && (
                        <p className="text-muted-foreground text-xs mt-2 italic">Save the event first to upload a cover photo</p>
                      )}
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file || !id) return;
                        try {
                          await uploadCoverPhoto.mutateAsync({ eventId: id, file });
                          toast.success('Cover photo uploaded');
                        } catch (err: unknown) {
                          toast.error(getUserFacingErrorMessage(err, 'Upload failed'));
                        }
                      }}
                    />
                  </div>
                </>
              )}

              {activeTab === 'tickets' && (
                <>
                  <div className="p-4 bg-card rounded-xl border border-border space-y-4 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Venue seating map</label>
                      <select
                        value={venueTemplateId}
                        onChange={(e) => setVenueTemplateId(e.target.value)}
                        className="w-full bg-muted border-none rounded-lg py-3 px-4 text-sm outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="">None (manual tier grid)</option>
                        {venueTemplates.map((vt) => (
                          <option key={vt.id} value={vt.id}>{vt.name}</option>
                        ))}
                      </select>
                      <p className="text-xs text-muted-foreground mt-2">
                        <Link to="/venues" className="underline">Manage venue templates</Link>
                      </p>
                    </div>
                    {usesVenueTemplate && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {[
                          ['balcony_left', 'Balcony Left'],
                          ['balcony_right', 'Balcony Right'],
                          ['vvip', 'VVIP'],
                          ['vip', 'VIP'],
                          ['regular', 'General Admission (500)'],
                        ].map(([key, label]) => (
                          <div key={key}>
                            <label className="text-xs text-muted-foreground">{label}</label>
                            <input
                              type="number"
                              value={venueTierPrices[key] ?? 0}
                              onChange={(e) =>
                                setVenueTierPrices((p) => ({ ...p, [key]: parseFloat(e.target.value) || 0 }))
                              }
                              className="w-full mt-1 bg-muted rounded-lg py-2 px-3 text-sm"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                    {usesVenueTemplate && isEditMode && venueSeatingSync && !venueSeatingSync.in_sync && (
                      <div
                        className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-sm text-amber-950"
                        role="alert"
                      >
                        <p className="font-medium">Seating out of sync with venue template</p>
                        <p className="text-xs mt-1 text-amber-900">
                          Template has <strong>{venueSeatingSync.template_map_seat_count}</strong> map seats;
                          this event has <strong>{venueSeatingSync.event_map_seat_count}</strong>.
                          Position-only changes on the venue map appear after refresh; new or removed seats need
                          re-provision.
                        </p>
                        <button
                          type="button"
                          disabled={provisioning}
                          onClick={() => runProvisionVenue(id!, true)}
                          className="mt-2 text-xs font-semibold underline disabled:opacity-50"
                        >
                          {provisioning ? 'Provisioning…' : 'Re-provision now'}
                        </button>
                      </div>
                    )}
                    {usesVenueTemplate && isEditMode && venueSeatingSync?.in_sync && venueSeatingSync.event_map_seat_count > 0 && (
                      <p className="text-xs text-green-800 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                        Seating in sync ({venueSeatingSync.event_map_seat_count} map seats match template).
                      </p>
                    )}
                    {usesVenueTemplate && isEditMode && venueSeatingSync?.in_sync !== false && (
                      <button
                        type="button"
                        disabled={provisioning}
                        onClick={() => runProvisionVenue(id!, true)}
                        className="text-sm underline disabled:opacity-50"
                      >
                        {provisioning ? 'Provisioning…' : 'Re-provision seats from template'}
                      </button>
                    )}
                  </div>

                  <div className="p-4 bg-muted rounded-lg border border-border flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-foreground">Base Currency</h4>
                      <p className="text-sm text-muted-foreground">All ticket prices will be entered in this currency.</p>
                    </div>
                    <select className="bg-card border border-border rounded-lg py-2 px-4 focus:border-primary outline-none">
                      <option value="JOD">JOD - Jordanian Dinar</option>
                      <option value="USD">USD - US Dollar</option>
                      <option value="EUR">EUR - Euro</option>
                      <option value="AED">AED - UAE Dirham</option>
                    </select>
                  </div>

                  {!usesVenueTemplate && (
                  <div className="space-y-4 mt-8">
                    <div className="flex justify-between items-center">
                      <label className="block text-sm font-medium text-foreground">Ticket Tiers</label>
                      <button
                        type="button"
                        onClick={handleAddTier}
                        className="text-sm text-foreground font-medium hover:underline flex items-center gap-1"
                      >
                        <Plus size={16} /> Add Tier
                      </button>
                    </div>

                    {tiers.map((tier, index) => (
                      <div
                        key={tier.id}
                        id={`admin-tier-card-${tier.id}`}
                        className="border border-border rounded-xl p-5 bg-card space-y-3 scroll-mt-28"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
                          <div className="space-y-2 lg:col-span-2">
                            <label className="block text-xs font-medium text-muted-foreground">Tier Name</label>
                            <input
                              type="text"
                              value={tier.name}
                              onChange={(e) => {
                                const newTiers = [...tiers];
                                newTiers[index] = { ...newTiers[index], name: e.target.value, modified: true };
                                setTiers(newTiers);
                              }}
                              placeholder="e.g. VIP"
                              className="w-full bg-muted border-none rounded-lg py-2 px-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="block text-xs font-medium text-muted-foreground">Price</label>
                            <div className="relative">
                              <span className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">JOD</span>
                              <input
                                type="number"
                                value={tier.price}
                                onChange={(e) => {
                                  const newTiers = [...tiers];
                                  newTiers[index] = { ...newTiers[index], price: parseFloat(e.target.value), modified: true };
                                  setTiers(newTiers);
                                }}
                                className="w-full bg-muted border-none rounded-lg py-2 ps-12 pe-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="block text-xs font-medium text-muted-foreground">Number of Seats</label>
                            <input
                              type="number"
                              value={tier.seats}
                              onChange={(e) => {
                                const newTiers = [...tiers];
                                newTiers[index] = { ...newTiers[index], seats: parseInt(e.target.value, 10), modified: true };
                                setTiers(newTiers);
                              }}
                              placeholder="500"
                              className="w-full bg-muted border-none rounded-lg py-2 px-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="block text-xs font-medium text-muted-foreground">Seats per row</label>
                            <input
                              type="number"
                              min={1}
                              value={tier.seatsPerRow}
                              onChange={(e) => {
                                const newTiers = [...tiers];
                                const v = Math.max(1, parseInt(e.target.value, 10) || 10);
                                newTiers[index] = { ...newTiers[index], seatsPerRow: v, modified: true };
                                setTiers(newTiers);
                              }}
                              className="w-full bg-muted border-none rounded-lg py-2 px-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="block text-xs font-medium text-muted-foreground">First row letter</label>
                            <input
                              type="text"
                              maxLength={1}
                              value={tier.rowLabelStart}
                              onChange={(e) => {
                                const newTiers = [...tiers];
                                const ch = e.target.value.replace(/[^a-zA-Z]/g, '').slice(-1);
                                newTiers[index] = { ...newTiers[index], rowLabelStart: ch, modified: true };
                                setTiers(newTiers);
                              }}
                              placeholder="A (optional)"
                              className="w-full bg-muted border-none rounded-lg py-2 px-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                            />
                          </div>
                          <div className="space-y-2 flex flex-col">
                            <label className="block text-xs font-medium text-muted-foreground">Actions</label>
                            <button
                              type="button"
                              onClick={() => handleRemoveTier(tier)}
                              className="w-full bg-red-50 text-red-600 border-none rounded-lg py-2 px-3 text-sm outline-none hover:bg-red-100 transition-colors"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Seat labels are generated as row + seat-in-row (e.g. A-0 … A-9, then B-0). Set the first row letter for venues that start at a different block (e.g. M). Leave it blank to start at A. Changing layout on an existing tier updates metadata only; seat numbers are set when the tier is first created.
                        </p>
                      </div>
                    ))}
                  </div>
                  )}
                </>
              )}

              {activeTab === 'location' && (
                <>
                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-foreground">Venue Name <span className="text-muted-foreground">*</span></label>
                    <input
                      type="text"
                      value={location}
                      onChange={e => setLocation(e.target.value)}
                      placeholder="e.g. Wadi Rum Amphitheater"
                      className="w-full bg-muted border border-transparent rounded-lg py-3 px-4 text-base focus:bg-card focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-foreground">Full Address</label>
                    <input
                      type="text"
                      value={fullAddress}
                      onChange={e => setFullAddress(e.target.value)}
                      placeholder="Street address, City, Country"
                      className="w-full bg-muted border border-transparent rounded-lg py-3 px-4 text-base focus:bg-card focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <label className="block text-sm font-medium text-foreground">Latitude</label>
                      <input
                        type="text"
                        value={locationLat}
                        onChange={e => setLocationLat(e.target.value)}
                        placeholder="e.g. 29.5734"
                        className="w-full bg-muted border border-transparent rounded-lg py-3 px-4 text-base focus:bg-card focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-4">
                      <label className="block text-sm font-medium text-foreground">Longitude</label>
                      <input
                        type="text"
                        value={locationLng}
                        onChange={e => setLocationLng(e.target.value)}
                        placeholder="e.g. 35.3919"
                        className="w-full bg-muted border border-transparent rounded-lg py-3 px-4 text-base focus:bg-card focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-foreground">Map Embed URL</label>
                    <input
                      type="url"
                      value={mapEmbedUrl}
                      onChange={e => setMapEmbedUrl(e.target.value)}
                      placeholder="Google Maps embed URL"
                      className="w-full bg-muted border border-transparent rounded-lg py-3 px-4 text-base focus:bg-card focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    />
                    <p className="text-xs text-muted-foreground">Get the embed URL from Google Maps → Share → Embed a map</p>
                  </div>

                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-foreground">Parking Information</label>
                    <textarea
                      rows={3}
                      value={parkingInfo}
                      onChange={e => setParkingInfo(e.target.value)}
                      placeholder="Describe parking availability and instructions..."
                      className="w-full bg-muted border border-transparent rounded-lg py-3 px-4 text-base focus:bg-card focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none"
                    ></textarea>
                  </div>
                </>
              )}

              {activeTab === 'contact' && (
                <>
                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-foreground">Organizer Name</label>
                    <input
                      type="text"
                      value={contactName}
                      onChange={e => setContactName(e.target.value)}
                      placeholder="e.g. TheAgencyJo Events"
                      className="w-full bg-muted border border-transparent rounded-lg py-3 px-4 text-base focus:bg-card focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-foreground">Contact Email</label>
                    <input
                      type="email"
                      value={contactEmail}
                      onChange={e => setContactEmail(e.target.value)}
                      placeholder="contact@theagencyjo.com"
                      className="w-full bg-muted border border-transparent rounded-lg py-3 px-4 text-base focus:bg-card focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-foreground">Contact Phone</label>
                    <PhoneCountryField
                      country={getCountryByIso(contactPhoneCountryIso) ?? COUNTRY_DIAL_CODES[0]}
                      onCountryChange={(iso) => {
                        setContactPhoneInvalid(false);
                        setContactPhoneCountryIso(iso);
                      }}
                      nationalNumber={contactPhoneNational}
                      onNationalNumberChange={(n) => {
                        setContactPhoneInvalid(false);
                        setContactPhoneNational(n);
                      }}
                      nationalPlaceholder={t('validation.phoneNationalPlaceholder')}
                      invalid={contactPhoneInvalid}
                    />
                  </div>
                </>
              )}

              {activeTab === 'settings' && (
                <>
                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-foreground">{t('admin.event_editor.visibility_label')}</label>
                    <select
                      value={visibility}
                      onChange={e => setVisibility(e.target.value as 'public' | 'unlisted')}
                      className="w-full bg-muted border border-transparent rounded-lg py-3 px-4 text-base focus:bg-card focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    >
                      <option value="public">{t('admin.event_editor.visibility_public')}</option>
                      <option value="unlisted">{t('admin.event_editor.visibility_unlisted')}</option>
                    </select>
                  </div>

                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-foreground">Sales Start Date</label>
                    <input
                      type="datetime-local"
                      value={salesStartDate}
                      onChange={e => setSalesStartDate(e.target.value)}
                      className="w-full bg-muted border border-transparent rounded-lg py-3 px-4 text-base focus:bg-card focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    />
                    <p className="text-xs text-muted-foreground">When tickets go on sale (leave empty to start immediately)</p>
                  </div>

                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-foreground">Sales End Date</label>
                    <input
                      type="datetime-local"
                      value={salesEndDate}
                      onChange={e => setSalesEndDate(e.target.value)}
                      className="w-full bg-muted border border-transparent rounded-lg py-3 px-4 text-base focus:bg-card focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    />
                    <p className="text-xs text-muted-foreground">When ticket sales close (leave empty for event start time)</p>
                  </div>

                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-foreground">Maximum Tickets Per Order</label>
                    <input
                      type="number"
                      value={maxTicketsPerOrder}
                      onChange={e => setMaxTicketsPerOrder(e.target.value)}
                      placeholder="e.g. 10"
                      className="w-full bg-muted border border-transparent rounded-lg py-3 px-4 text-base focus:bg-card focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    />
                  </div>


                  <div className="p-6 bg-green-50 border border-green-200 rounded-xl mt-8">
                    <h4 className="font-bold text-green-800 mb-2 flex items-center gap-2">
                      <CheckCircle className="shrink-0" size={20} />
                      Ready to Publish
                    </h4>
                    <p className="text-green-700 text-sm mb-4">
                      Your event is complete and ready to go live. Click "Publish" in the header to make it visible to customers.
                    </p>
                    <ul className="text-green-700 text-sm space-y-1">
                      <li>✓ Basic information completed</li>
                      <li>✓ At least one ticket tier configured</li>
                      <li>✓ Location and contact details provided</li>
                    </ul>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
