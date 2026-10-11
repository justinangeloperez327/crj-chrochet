import { DatabaseRequired } from "@/components/admin/database-required";
import {
  resetStoreSettings,
  updateStoreSettings,
} from "@/app/admin/settings/actions";
import { getStoreSettings } from "@/lib/settings/store-settings";

export const metadata = { title: "Store Settings" };

export default async function AdminSettingsPage() {
  if (!process.env.DATABASE_URL) return <DatabaseRequired />;

  const settings = await getStoreSettings();

  return (
    <div>
      <div>
        <p className="text-[10px] font-semibold tracking-[0.16em] text-bloom-violet uppercase">
          Configuration
        </p>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-[-0.04em]">
          Store settings
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-bloom-muted">
          Central business, checkout, delivery, production, storefront, and SEO
          defaults. Secrets such as Stripe and Resend keys remain environment
          variables and never belong here.
        </p>
      </div>

      <form action={updateStoreSettings} className="mt-7 space-y-6">
        <Section
          title="Business identity"
          hint="Used by storefront chrome and default SEO."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              name="businessName"
              label="Business name"
              defaultValue={settings.businessName}
              required
            />
            <Field
              name="brandByline"
              label="Brand byline"
              defaultValue={settings.brandByline}
              required
            />
            <label className="md:col-span-2">
              <FieldLabel>Tagline</FieldLabel>
              <textarea
                name="tagline"
                rows={3}
                required
                defaultValue={settings.tagline}
                className="mt-2 w-full border border-bloom-border px-3 py-2 text-xs outline-none focus:border-bloom-violet"
              />
            </label>
          </div>
        </Section>

        <Section
          title="Contact & social"
          hint="Public links shown in the storefront footer when configured."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              name="supportEmail"
              label="Support email"
              type="email"
              defaultValue={settings.supportEmail ?? ""}
            />
            <Field
              name="supportPhone"
              label="Support phone"
              defaultValue={settings.supportPhone ?? ""}
            />
            <Field
              name="instagramUrl"
              label="Instagram URL"
              type="url"
              defaultValue={settings.instagramUrl ?? ""}
            />
            <Field
              name="facebookUrl"
              label="Facebook URL"
              type="url"
              defaultValue={settings.facebookUrl ?? ""}
            />
            <Field
              name="tiktokUrl"
              label="TikTok URL"
              type="url"
              defaultValue={settings.tiktokUrl ?? ""}
            />
            <Field
              name="whatsappUrl"
              label="WhatsApp URL"
              type="url"
              defaultValue={settings.whatsappUrl ?? ""}
            />
          </div>
        </Section>

        <Section
          title="Storefront state"
          hint="Maintenance blocks new storefront commerce while account, admin, existing-order confirmation, and quote-payment links stay reachable."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Check
              name="announcementEnabled"
              label="Show announcement bar"
              defaultChecked={settings.announcementEnabled}
            />
            <Check
              name="maintenanceMode"
              label="Maintenance mode"
              defaultChecked={settings.maintenanceMode}
            />
            <label className="md:col-span-2">
              <FieldLabel>Announcement text</FieldLabel>
              <input
                name="announcementText"
                required
                defaultValue={settings.announcementText}
                className="mt-2 h-10 w-full border border-bloom-border px-3 text-xs"
              />
            </label>
            <label className="md:col-span-2">
              <FieldLabel>Maintenance message</FieldLabel>
              <textarea
                name="maintenanceMessage"
                rows={3}
                required
                defaultValue={settings.maintenanceMessage}
                className="mt-2 w-full border border-bloom-border px-3 py-2 text-xs"
              />
            </label>
          </div>
        </Section>

        <Section
          title="Checkout & order defaults"
          hint="Server-side validation remains authoritative. The current catalog is single-currency and supports AED only."
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Field
              name="defaultCurrency"
              label="Currency"
              defaultValue={settings.defaultCurrency}
              required
              maxLength={3}
              readOnly
            />
            <Field
              name="checkoutReservationMinutes"
              label="Reservation minutes"
              type="number"
              min="30"
              max="240"
              defaultValue={settings.checkoutReservationMinutes}
              required
            />
            <Field
              name="giftMessageMaxLength"
              label="Gift message max"
              type="number"
              min="0"
              max="1000"
              defaultValue={settings.giftMessageMaxLength}
              required
            />
            <Field
              name="orderNoteMaxLength"
              label="Order note max"
              type="number"
              min="0"
              max="2000"
              defaultValue={settings.orderNoteMaxLength}
              required
            />
            <div className="md:col-span-2 xl:col-span-4">
              <Check
                name="giftOrdersEnabled"
                label="Allow gift orders"
                defaultChecked={settings.giftOrdersEnabled}
              />
            </div>
          </div>
        </Section>

        <Section
          title="Delivery rates"
          hint="Database values override environment delivery rates. Blank fields fall back to DELIVERY_RATE_* then DELIVERY_FLAT_RATE_AED."
        >
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MoneyField
              name="deliveryFlatRate"
              label="Flat fallback"
              value={settings.deliveryFlatRate}
            />
            <MoneyField
              name="deliveryAbuDhabi"
              label="Abu Dhabi"
              value={settings.deliveryAbuDhabi}
            />
            <MoneyField
              name="deliveryDubai"
              label="Dubai"
              value={settings.deliveryDubai}
            />
            <MoneyField
              name="deliverySharjah"
              label="Sharjah"
              value={settings.deliverySharjah}
            />
            <MoneyField
              name="deliveryAjman"
              label="Ajman"
              value={settings.deliveryAjman}
            />
            <MoneyField
              name="deliveryUmmAlQuwain"
              label="Umm Al Quwain"
              value={settings.deliveryUmmAlQuwain}
            />
            <MoneyField
              name="deliveryRasAlKhaimah"
              label="Ras Al Khaimah"
              value={settings.deliveryRasAlKhaimah}
            />
            <MoneyField
              name="deliveryFujairah"
              label="Fujairah"
              value={settings.deliveryFujairah}
            />
          </div>
        </Section>

        <Section
          title="Production defaults"
          hint="Applied only when a new production job is created. Admins can still override each job."
        >
          <div className="grid gap-4 md:grid-cols-3">
            <label>
              <FieldLabel>Default priority</FieldLabel>
              <select
                name="productionDefaultPriority"
                defaultValue={settings.productionDefaultPriority}
                className="mt-2 h-10 w-full border border-bloom-border bg-white px-3 text-xs"
              >
                <option value="LOW">Low</option>
                <option value="NORMAL">Normal</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </label>
            <Field
              name="productionDefaultMinutes"
              label="Default planned minutes"
              type="number"
              min="1"
              max="10080"
              defaultValue={settings.productionDefaultMinutes ?? ""}
            />
            <Field
              name="productionDefaultAssignee"
              label="Default assignee"
              defaultValue={settings.productionDefaultAssignee ?? ""}
            />
          </div>
        </Section>

        <Section
          title="SEO defaults"
          hint="Used by the root application metadata; product and collection metadata can still override these."
        >
          <div className="grid gap-4">
            <Field
              name="seoTitle"
              label="Default SEO title"
              defaultValue={settings.seoTitle}
              required
              maxLength={70}
            />
            <label>
              <FieldLabel>Default SEO description</FieldLabel>
              <textarea
                name="seoDescription"
                rows={3}
                required
                maxLength={180}
                defaultValue={settings.seoDescription}
                className="mt-2 w-full border border-bloom-border px-3 py-2 text-xs"
              />
            </label>
          </div>
        </Section>

        <button
          type="submit"
          className="h-11 bg-bloom-plum px-6 text-xs font-semibold text-white"
        >
          Save settings
        </button>
      </form>

      <form
        action={resetStoreSettings}
        className="mt-6 border border-red-200 bg-white p-5"
      >
        <h2 className="text-sm font-semibold text-red-700">
          Reset application defaults
        </h2>
        <p className="mt-2 text-[11px] leading-5 text-bloom-muted">
          Restores code defaults and clears database delivery/contact/social
          overrides. Environment secrets and delivery fallback variables are
          untouched.
        </p>
        <button
          type="submit"
          className="mt-4 h-9 border border-red-200 bg-red-50 px-4 text-[10px] font-semibold text-red-700"
        >
          Reset settings
        </button>
      </form>
    </div>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-bloom-border bg-white p-5">
      <h2 className="text-sm font-semibold">{title}</h2>
      <p className="mt-1 text-[11px] leading-5 text-bloom-muted">{hint}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Field({
  label,
  name,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  name: string;
}) {
  return (
    <label>
      <FieldLabel>{label}</FieldLabel>
      <input
        name={name}
        {...props}
        className="mt-2 h-10 w-full border border-bloom-border px-3 text-xs outline-none focus:border-bloom-violet"
      />
    </label>
  );
}

function MoneyField({
  name,
  label,
  value,
}: {
  name: string;
  label: string;
  value: number | null;
}) {
  return (
    <Field
      name={name}
      label={`${label} (AED)`}
      type="number"
      min="0"
      max="10000"
      step="0.01"
      defaultValue={value ?? ""}
      placeholder="env fallback"
    />
  );
}

function Check({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex items-center gap-2 text-xs">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
      />
      <span className="font-medium text-bloom-plum">{label}</span>
    </label>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-bloom-muted">
      {children}
    </span>
  );
}
