import { useState, useEffect } from "react";
import {
  Settings as SettingsIcon,
  Phone,
  Mail,
  MessageCircle,
  Save,
  Loader2,
  Share2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { useSettings, useUpdateSettings } from "../../../hooks/useSettings";
import type { SettingsUpdate } from "../../../api/settings";
import { coerceExternalUrlForSave } from "../../../utils/normalizeExternalUrl";
import { PhoneCountryField } from "../../components/PhoneCountryField";
import { COUNTRY_DIAL_CODES, getCountryByIso } from "../../data/countryDialCodes";
import {
  isValidNationalPhone,
  parseE164ToForm,
  phoneFormToE164,
  type PhoneFormState,
} from "../../utils/phoneValidation";
import { useLanguage } from "../../contexts/LanguageContext";

const CURRENCIES = ["JOD", "USD", "EUR", "GBP", "SAR", "AED" , "EGP"] as const;

const SETTINGS_TABS = [
  { id: "general", label: "General", icon: SettingsIcon },
  { id: "contact", label: "Global Contact Info", icon: Phone },
  { id: "footer", label: "Footer URLs", icon: Share2 },
  { id: "brand", label: "Brand Identity", icon: Sparkles },
];

function FieldSkeleton() {
  return <div className="h-10 bg-[#e8e8e8] rounded-lg animate-pulse" />;
}

const emptyPhoneForm = (): PhoneFormState => ({
  phoneCountryIso: "JO",
  phoneNational: "",
});

export function AdminSettings() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("general");
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();

  const [general, setGeneral] = useState({
    platform_name: "",
    logo_url: "",
    logo_url_dark: "",
    home_watch_reel_url: "",
    currency: "EGP",
  });

  const [contact, setContact] = useState({
    contact_phone_label_1: "",
    contact_phone_1: "",
    contact_phone_label_2: "",
    contact_phone_2: "",
    contact_whatsapp: "",
    contact_whatsapp_enabled: false,
    contact_email: "",
    contact_address: "",
  });

  const [footer, setFooter] = useState({
    footer_instagram_url: "",
  });

  const [brand, setBrand] = useState({
    brand_name: "",
    brand_website_url: "",
    brand_instagram_url: "",
    brand_contact_email: "",
    ni_merchant_name: "",
    ni_brand_logo_url: "",
  });

  const [phoneLine1, setPhoneLine1] = useState<PhoneFormState>(emptyPhoneForm);
  const [phoneLine2, setPhoneLine2] = useState<PhoneFormState>(emptyPhoneForm);
  const [whatsappLine, setWhatsappLine] = useState<PhoneFormState>(emptyPhoneForm);
  const [phoneLine1Invalid, setPhoneLine1Invalid] = useState(false);
  const [phoneLine2Invalid, setPhoneLine2Invalid] = useState(false);
  const [whatsappInvalid, setWhatsappInvalid] = useState(false);

  useEffect(() => {
    if (!settings) return;
    setGeneral({
      platform_name: settings.platform_name ?? "",
      logo_url: settings.logo_url ?? "",
      logo_url_dark: settings.logo_url_dark ?? "",
      home_watch_reel_url: settings.home_watch_reel_url ?? "",
      currency: settings.currency ?? "EGP",
    });
    setContact({
      contact_phone_label_1: settings.contact_phone_label_1 ?? "",
      contact_phone_1: settings.contact_phone_1 ?? "",
      contact_phone_label_2: settings.contact_phone_label_2 ?? "",
      contact_phone_2: settings.contact_phone_2 ?? "",
      contact_whatsapp: settings.contact_whatsapp ?? "",
      contact_whatsapp_enabled: settings.contact_whatsapp_enabled ?? false,
      contact_email: settings.contact_email ?? "",
      contact_address: settings.contact_address ?? "",
    });
    setPhoneLine1(parseE164ToForm(settings.contact_phone_1));
    setPhoneLine2(parseE164ToForm(settings.contact_phone_2));
    setWhatsappLine(parseE164ToForm(settings.contact_whatsapp));
    setPhoneLine1Invalid(false);
    setPhoneLine2Invalid(false);
    setWhatsappInvalid(false);
    setFooter({
      footer_instagram_url: settings.footer_instagram_url ?? "",
    });
    setBrand({
      brand_name: settings.brand_name ?? "",
      brand_website_url: settings.brand_website_url ?? "",
      brand_instagram_url: settings.brand_instagram_url ?? "",
      brand_contact_email: settings.brand_contact_email ?? "",
      ni_merchant_name: settings.ni_merchant_name ?? "",
      ni_brand_logo_url: settings.ni_brand_logo_url ?? "",
    });
  }, [settings]);

  const handleSaveGeneral = () => {
    const payload: SettingsUpdate = {
      platform_name: general.platform_name,
      logo_url: general.logo_url || null,
      logo_url_dark: general.logo_url_dark.trim() || null,
      home_watch_reel_url: general.home_watch_reel_url.trim() || null,
      currency: general.currency,
    };
    updateSettings.mutate(payload, {
      onSuccess: () => toast.success("General settings saved"),
      onError: () => toast.error("Failed to save general settings"),
    });
  };

  const resolvePhoneE164 = (
    line: PhoneFormState,
    setInvalid: (v: boolean) => void,
  ): string | null => {
    const national = line.phoneNational.trim();
    if (!national) return null;
    if (!isValidNationalPhone(national)) {
      setInvalid(true);
      toast.error(t("validation.phoneNationalTenDigits"));
      throw new Error("invalid phone");
    }
    const e164 = phoneFormToE164(line.phoneCountryIso, national);
    if (!e164) {
      setInvalid(true);
      toast.error(t("validation.phoneNationalTenDigits"));
      throw new Error("invalid phone");
    }
    setInvalid(false);
    return e164;
  };

  const handleSaveContact = () => {
    let phone1E164: string | null = null;
    let phone2E164: string | null = null;
    let whatsappE164: string | null = null;
    try {
      phone1E164 = resolvePhoneE164(phoneLine1, setPhoneLine1Invalid);
      phone2E164 = resolvePhoneE164(phoneLine2, setPhoneLine2Invalid);
      whatsappE164 = resolvePhoneE164(whatsappLine, setWhatsappInvalid);
    } catch {
      return;
    }

    const payload: SettingsUpdate = {
      contact_phone_label_1: contact.contact_phone_label_1 || null,
      contact_phone_1: phone1E164,
      contact_phone_label_2: contact.contact_phone_label_2 || null,
      contact_phone_2: phone2E164,
      contact_whatsapp: whatsappE164,
      contact_whatsapp_enabled: contact.contact_whatsapp_enabled,
      contact_email: contact.contact_email || null,
      contact_address: contact.contact_address.trim() || null,
    };
    updateSettings.mutate(payload, {
      onSuccess: () => toast.success("Contact settings saved"),
      onError: () => toast.error("Failed to save contact settings"),
    });
  };

  const handleSaveFooter = () => {
    const payload: SettingsUpdate = {
      footer_instagram_url: coerceExternalUrlForSave(footer.footer_instagram_url),
    };
    updateSettings.mutate(payload, {
      onSuccess: () => toast.success("Footer URLs saved"),
      onError: () => toast.error("Failed to save footer URLs"),
    });
  };

  const handleSaveBrand = () => {
    const payload: SettingsUpdate = {
      brand_name: brand.brand_name || null,
      brand_website_url: coerceExternalUrlForSave(brand.brand_website_url),
      brand_instagram_url: coerceExternalUrlForSave(brand.brand_instagram_url),
      brand_contact_email: brand.brand_contact_email || null,
      ni_merchant_name: brand.ni_merchant_name || null,
      ni_brand_logo_url: coerceExternalUrlForSave(brand.ni_brand_logo_url),
    };
    updateSettings.mutate(payload, {
      onSuccess: () => toast.success("Brand identity saved"),
      onError: () => toast.error("Failed to save brand identity"),
    });
  };

  const isSaving = updateSettings.isPending;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <div>
        <h1 className="text-3xl font-bold font-['Tajawal'] text-[#000000]">Platform Settings</h1>
        <p className="text-[#8c8c8c] mt-1">Configure global preferences, contact details, and platform defaults.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mt-8">
        {/* Sidebar Nav */}
        <div className="lg:col-span-1 space-y-1 bg-white p-4 rounded-xl border border-[#e8e8e8] shadow-[0_8px_24px_rgba(20,14,8,0.04)]">
          {SETTINGS_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-start ${
                  isActive
                    ? "bg-[#e8e8e8] text-[#000000] font-medium"
                    : "text-[#8c8c8c] hover:bg-[#e8e8e8]/50 hover:text-[#000000]"
                }`}
              >
                <Icon size={18} className={isActive ? "text-[#000000]" : "text-[#8c8c8c]"} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Settings Area */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-xl shadow-[0_8px_24px_rgba(20,14,8,0.04)] border border-[#e8e8e8] overflow-hidden">
            <div className="p-6 border-b border-[#e8e8e8]">
              <h2 className="text-xl font-bold font-['Tajawal'] text-[#000000]">
                {SETTINGS_TABS.find((t) => t.id === activeTab)?.label}
              </h2>
              {activeTab === "contact" && (
                <p className="text-sm text-[#8c8c8c] mt-1">
                  These details will be displayed globally on the site footer and contact pages.
                </p>
              )}
              {activeTab === "footer" && (
                <p className="text-sm text-[#8c8c8c] mt-1">
                  Instagram link for the public site footer. Leave empty to use the built-in default.
                </p>
              )}
              {activeTab === "general" && (
                <p className="text-sm text-[#8c8c8c] mt-1">
                  Core platform configuration — name, branding, and currency defaults.
                </p>
              )}
              {activeTab === "brand" && (
                <p className="text-sm text-[#8c8c8c] mt-1">
                  Brand identity values used by the public site, emails, and the NI payment checkout. Same backend code runs multiple brands by varying these.
                </p>
              )}
            </div>

            <div className="p-6">
              {activeTab === "general" && (
                <div className="space-y-6 max-w-2xl">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-[#000000]">Platform Name</label>
                    {isLoading ? (
                      <FieldSkeleton />
                    ) : (
                      <input
                        type="text"
                        value={general.platform_name}
                        onChange={(e) => setGeneral({ ...general, platform_name: e.target.value })}
                        className="w-full bg-[#e8e8e8] border border-transparent rounded-lg py-2.5 px-4 text-sm focus:bg-white focus:border-[#000000] outline-none"
                        placeholder="TheAgencyJo"
                      />
                    )}
                    <p className="text-xs text-[#8c8c8c]">Displayed in the browser tab and frontend header.</p>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-[#000000]">Logo URL</label>
                    {isLoading ? (
                      <FieldSkeleton />
                    ) : (
                      <input
                        type="url"
                        value={general.logo_url}
                        onChange={(e) => setGeneral({ ...general, logo_url: e.target.value })}
                        className="w-full bg-[#e8e8e8] border border-transparent rounded-lg py-2.5 px-4 text-sm focus:bg-white focus:border-[#000000] outline-none"
                        placeholder="https://example.com/logo.png"
                      />
                    )}
                    <p className="text-xs text-[#8c8c8c]">Direct URL to the platform logo image (for light backgrounds, PDFs, and email).</p>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-[#000000]">Logo URL (dark backgrounds)</label>
                    {isLoading ? (
                      <FieldSkeleton />
                    ) : (
                      <input
                        type="url"
                        value={general.logo_url_dark}
                        onChange={(e) => setGeneral({ ...general, logo_url_dark: e.target.value })}
                        className="w-full bg-[#e8e8e8] border border-transparent rounded-lg py-2.5 px-4 text-sm focus:bg-white focus:border-[#000000] outline-none"
                        placeholder="https://example.com/logo-white.png"
                      />
                    )}
                    <p className="text-xs text-[#8c8c8c]">Optional light / inverted logo for dark sections (e.g. hero). If empty, the site may auto-invert the default logo where needed.</p>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-[#000000]">Home — Watch reel URL</label>
                    {isLoading ? (
                      <FieldSkeleton />
                    ) : (
                      <input
                        type="url"
                        value={general.home_watch_reel_url}
                        onChange={(e) => setGeneral({ ...general, home_watch_reel_url: e.target.value })}
                        className="w-full bg-[#e8e8e8] border border-transparent rounded-lg py-2.5 px-4 text-sm focus:bg-white focus:border-[#000000] outline-none"
                        placeholder="https://www.instagram.com/reel/..."
                      />
                    )}
                    <p className="text-xs text-[#8c8c8c]">Instagram, TikTok, or other reel link for the &quot;Watch Reel&quot; button on the public home hero. Leave empty to hide that button.</p>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-[#000000]">Currency</label>
                    {isLoading ? (
                      <FieldSkeleton />
                    ) : (
                      <select
                        value={general.currency}
                        onChange={(e) => setGeneral({ ...general, currency: e.target.value })}
                        className="w-full bg-[#e8e8e8] border border-transparent rounded-lg py-2.5 px-4 text-sm focus:bg-white focus:border-[#000000] outline-none"
                      >
                        {CURRENCIES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    )}
                    <p className="text-xs text-[#8c8c8c]">Default currency shown in the dashboard and frontend.</p>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={handleSaveGeneral}
                      disabled={isSaving || isLoading}
                      className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-accent transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                      {isSaving ? "Saving..." : "Save General Settings"}
                    </button>
                  </div>
                </div>
              )}

              {activeTab === "contact" && (
                <div className="space-y-8 max-w-2xl">
                  <div className="space-y-4">
                    <h3 className="font-bold text-[#000000] flex items-center gap-2 border-b border-[#e8e8e8] pb-2">
                      <Phone size={18} className="text-[#000000] shrink-0" /> Primary Phone Numbers
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-[#000000]">Line 1 Label</label>
                        {isLoading ? (
                          <FieldSkeleton />
                        ) : (
                          <input
                            type="text"
                            value={contact.contact_phone_label_1}
                            onChange={(e) => setContact({ ...contact, contact_phone_label_1: e.target.value })}
                            className="w-full bg-[#e8e8e8] border border-transparent rounded-lg py-2.5 px-4 text-sm focus:bg-white focus:border-[#000000] outline-none"
                            placeholder="Booking & Inquiries"
                          />
                        )}
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <label className="block text-sm font-medium text-[#000000]">Line 1 Number</label>
                        {isLoading ? (
                          <FieldSkeleton />
                        ) : (
                          <PhoneCountryField
                            country={getCountryByIso(phoneLine1.phoneCountryIso) ?? COUNTRY_DIAL_CODES[0]}
                            onCountryChange={(iso) => {
                              setPhoneLine1Invalid(false);
                              setPhoneLine1((p) => ({ ...p, phoneCountryIso: iso }));
                            }}
                            nationalNumber={phoneLine1.phoneNational}
                            onNationalNumberChange={(n) => {
                              setPhoneLine1Invalid(false);
                              setPhoneLine1((p) => ({ ...p, phoneNational: n }));
                            }}
                            nationalPlaceholder={t("validation.phoneNationalPlaceholder")}
                            invalid={phoneLine1Invalid}
                          />
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-[#000000]">Line 2 Label</label>
                        {isLoading ? (
                          <FieldSkeleton />
                        ) : (
                          <input
                            type="text"
                            value={contact.contact_phone_label_2}
                            onChange={(e) => setContact({ ...contact, contact_phone_label_2: e.target.value })}
                            className="w-full bg-[#e8e8e8] border border-transparent rounded-lg py-2.5 px-4 text-sm focus:bg-white focus:border-[#000000] outline-none"
                            placeholder="General Inquiries"
                          />
                        )}
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-[#000000]">Line 2 Number</label>
                        {isLoading ? (
                          <FieldSkeleton />
                        ) : (
                          <PhoneCountryField
                            country={getCountryByIso(phoneLine2.phoneCountryIso) ?? COUNTRY_DIAL_CODES[0]}
                            onCountryChange={(iso) => {
                              setPhoneLine2Invalid(false);
                              setPhoneLine2((p) => ({ ...p, phoneCountryIso: iso }));
                            }}
                            nationalNumber={phoneLine2.phoneNational}
                            onNationalNumberChange={(n) => {
                              setPhoneLine2Invalid(false);
                              setPhoneLine2((p) => ({ ...p, phoneNational: n }));
                            }}
                            nationalPlaceholder={t("validation.phoneNationalPlaceholder")}
                            invalid={phoneLine2Invalid}
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 pt-4">
                    <h3 className="font-bold text-[#000000] flex items-center gap-2 border-b border-[#e8e8e8] pb-2">
                      <MessageCircle size={18} className="text-[#525252] shrink-0" /> WhatsApp Integration
                    </h3>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-[#000000]">WhatsApp Number</label>
                      {isLoading ? (
                        <FieldSkeleton />
                      ) : (
                        <PhoneCountryField
                          country={getCountryByIso(whatsappLine.phoneCountryIso) ?? COUNTRY_DIAL_CODES[0]}
                          onCountryChange={(iso) => {
                            setWhatsappInvalid(false);
                            setWhatsappLine((p) => ({ ...p, phoneCountryIso: iso }));
                          }}
                          nationalNumber={whatsappLine.phoneNational}
                          onNationalNumberChange={(n) => {
                            setWhatsappInvalid(false);
                            setWhatsappLine((p) => ({ ...p, phoneNational: n }));
                          }}
                          nationalPlaceholder={t("validation.phoneNationalPlaceholder")}
                          invalid={whatsappInvalid}
                        />
                      )}
                      <p className="text-xs text-[#8c8c8c]">Used for "Chat on WhatsApp" links.</p>
                    </div>

                    <div className="flex items-center gap-3">
                      {isLoading ? (
                        <div className="h-6 w-11 bg-[#e8e8e8] rounded-full animate-pulse" />
                      ) : (
                        <button
                          role="switch"
                          aria-checked={contact.contact_whatsapp_enabled}
                          onClick={() => setContact({ ...contact, contact_whatsapp_enabled: !contact.contact_whatsapp_enabled })}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            contact.contact_whatsapp_enabled ? "bg-[#000000]" : "bg-[#e8e8e8]"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 rounded-full bg-white transition-[margin] ${
                              contact.contact_whatsapp_enabled ? "ms-6" : "ms-1"
                            }`}
                          />
                        </button>
                      )}
                      <span className="text-sm text-[#000000]">Enable WhatsApp button on the frontend</span>
                    </div>
                  </div>

                  <div className="space-y-4 pt-4">
                    <h3 className="font-bold text-[#000000] flex items-center gap-2 border-b border-[#e8e8e8] pb-2">
                      <Mail size={18} className="text-[#000000] shrink-0" /> Email Support
                    </h3>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-[#000000]">Support Email Address</label>
                      {isLoading ? (
                        <FieldSkeleton />
                      ) : (
                        <input
                          type="email"
                          value={contact.contact_email}
                          onChange={(e) => setContact({ ...contact, contact_email: e.target.value })}
                          className="w-full bg-[#e8e8e8] border border-transparent rounded-lg py-2.5 px-4 text-sm focus:bg-white focus:border-[#000000] outline-none"
                          placeholder="hello@theagencyjo.com"
                        />
                      )}
                    </div>
                  </div>

                  <div className="space-y-4 pt-4">
                    <h3 className="font-bold text-[#000000] flex items-center gap-2 border-b border-[#e8e8e8] pb-2">
                      Visit / office address
                    </h3>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-[#000000]">Contact page — Visit card</label>
                      {isLoading ? (
                        <FieldSkeleton />
                      ) : (
                        <textarea
                          value={contact.contact_address}
                          onChange={(e) => setContact({ ...contact, contact_address: e.target.value })}
                          rows={4}
                          className="w-full bg-[#e8e8e8] border border-transparent rounded-lg py-2.5 px-4 text-sm focus:bg-white focus:border-[#000000] outline-none resize-y min-h-[100px]"
                          placeholder="Street, city, country (shown on the public Contact page)"
                        />
                      )}
                      <p className="text-xs text-[#8c8c8c]">Shown on the public site Contact page. Leave empty to hide the visit block.</p>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={handleSaveContact}
                      disabled={isSaving || isLoading}
                      className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-accent transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                      {isSaving ? "Saving..." : "Save Contact Settings"}
                    </button>
                  </div>
                </div>
              )}

              {activeTab === "footer" && (
                <div className="space-y-6 max-w-2xl">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-[#000000]">Instagram URL</label>
                    {isLoading ? (
                      <FieldSkeleton />
                    ) : (
                      <input
                        type="url"
                        value={footer.footer_instagram_url}
                        onChange={(e) => setFooter({ ...footer, footer_instagram_url: e.target.value })}
                        className="w-full bg-[#e8e8e8] border border-transparent rounded-lg py-2.5 px-4 text-sm focus:bg-white focus:border-[#000000] outline-none"
                        placeholder="https://www.instagram.com/yourpage/"
                      />
                    )}
                    <p className="text-xs text-[#8c8c8c]">
                      Use a full URL (e.g. https://www.instagram.com/yourpage/). Placeholder text without https:// will not work.
                    </p>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleSaveFooter}
                      disabled={isSaving || isLoading}
                      className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-accent transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                      {isSaving ? "Saving..." : "Save Footer URLs"}
                    </button>
                  </div>
                </div>
              )}

              {activeTab === "brand" && (
                <div className="space-y-6 max-w-2xl">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-[#000000]">Brand Name</label>
                    {isLoading ? <FieldSkeleton /> : (
                      <input
                        type="text"
                        value={brand.brand_name}
                        onChange={(e) => setBrand({ ...brand, brand_name: e.target.value })}
                        className="w-full bg-[#e8e8e8] border border-transparent rounded-lg py-2.5 px-4 text-sm focus:bg-white focus:border-[#000000] outline-none"
                        placeholder="TheAgencyJo"
                      />
                    )}
                    <p className="text-xs text-[#8c8c8c]">Display name used in emails, OG metadata, and copyright lines (when wired up).</p>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-[#000000]">Brand Website URL</label>
                    {isLoading ? <FieldSkeleton /> : (
                      <input
                        type="url"
                        value={brand.brand_website_url}
                        onChange={(e) => setBrand({ ...brand, brand_website_url: e.target.value })}
                        className="w-full bg-[#e8e8e8] border border-transparent rounded-lg py-2.5 px-4 text-sm focus:bg-white focus:border-[#000000] outline-none"
                        placeholder="https://theagencyjo.com"
                      />
                    )}
                    <p className="text-xs text-[#8c8c8c]">Shown on the NI payment checkout under the merchant logo. Customers click this if they want more info before paying.</p>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-[#000000]">Brand Instagram URL</label>
                    {isLoading ? <FieldSkeleton /> : (
                      <input
                        type="url"
                        value={brand.brand_instagram_url}
                        onChange={(e) => setBrand({ ...brand, brand_instagram_url: e.target.value })}
                        className="w-full bg-[#e8e8e8] border border-transparent rounded-lg py-2.5 px-4 text-sm focus:bg-white focus:border-[#000000] outline-none"
                        placeholder="https://www.instagram.com/theagencyjo/"
                      />
                    )}
                    <p className="text-xs text-[#8c8c8c]">Separate from Footer URLs → Instagram (which is per-region marketing). This is the official brand handle.</p>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-[#000000]">Brand Contact Email</label>
                    {isLoading ? <FieldSkeleton /> : (
                      <input
                        type="email"
                        value={brand.brand_contact_email}
                        onChange={(e) => setBrand({ ...brand, brand_contact_email: e.target.value })}
                        className="w-full bg-[#e8e8e8] border border-transparent rounded-lg py-2.5 px-4 text-sm focus:bg-white focus:border-[#000000] outline-none"
                        placeholder="hello@theagencyjo.com"
                      />
                    )}
                    <p className="text-xs text-[#8c8c8c]">Primary public address. Used in schema.org / OG metadata. Per-region addresses live in the Global Contact Info tab.</p>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-[#000000]">NI Merchant Name</label>
                    {isLoading ? <FieldSkeleton /> : (
                      <input
                        type="text"
                        value={brand.ni_merchant_name}
                        onChange={(e) => setBrand({ ...brand, ni_merchant_name: e.target.value })}
                        className="w-full bg-[#e8e8e8] border border-transparent rounded-lg py-2.5 px-4 text-sm focus:bg-white focus:border-[#000000] outline-none"
                        placeholder="THEAGENCYJO"
                      />
                    )}
                    <p className="text-xs text-[#8c8c8c]">Merchant name shown on the NI hosted checkout page (uppercase, ≤25 chars).</p>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-[#000000]">NI Merchant Logo URL</label>
                    {isLoading ? <FieldSkeleton /> : (
                      <input
                        type="url"
                        value={brand.ni_brand_logo_url}
                        onChange={(e) => setBrand({ ...brand, ni_brand_logo_url: e.target.value })}
                        className="w-full bg-[#e8e8e8] border border-transparent rounded-lg py-2.5 px-4 text-sm focus:bg-white focus:border-[#000000] outline-none"
                        placeholder="https://res.cloudinary.com/.../logo.png"
                      />
                    )}
                    <p className="text-xs text-[#8c8c8c]">Absolute URL to a hosted logo image (PNG/SVG). Shown on the NI checkout. If empty, falls back to the platform logo from the General tab.</p>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleSaveBrand}
                      disabled={isSaving || isLoading}
                      className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-accent transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                      {isSaving ? "Saving..." : "Save Brand Identity"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
