import {
  addAccountAddress,
  deleteAccountAddress,
  setDefaultAddress,
} from "@/app/account/actions";
import { requireUser } from "@/lib/auth/guards";
import { listAccountAddresses } from "@/lib/data/account-repository";

export const metadata = { title: "Addresses" };

const emirates = [
  "Abu Dhabi",
  "Dubai",
  "Sharjah",
  "Ajman",
  "Umm Al Quwain",
  "Ras Al Khaimah",
  "Fujairah",
];

export default async function AccountAddressesPage() {
  const user = await requireUser();
  const addresses = await listAccountAddresses(user.id);

  if (!addresses) return null;

  return (
    <div>
      <p className="text-[10px] font-semibold tracking-[0.16em] text-bloom-pink uppercase">
        Delivery
      </p>
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-[-0.04em] text-bloom-plum">
        Saved addresses
      </h1>
      <p className="mt-2 text-sm text-bloom-muted">
        Keep frequently used UAE delivery details ready for future orders.
      </p>

      <div className="mt-7 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="space-y-3">
          {addresses.length > 0 ? (
            addresses.map((address) => (
              <article
                key={address.id}
                className="border border-bloom-border bg-white p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-bloom-plum">
                        {address.label || "Address"}
                      </p>
                      {address.isDefault ? (
                        <span className="border border-bloom-pink/20 bg-bloom-pink-soft px-2 py-1 text-[9px] font-semibold tracking-[0.08em] text-bloom-pink uppercase">
                          Default
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-3 text-xs font-semibold text-bloom-plum">
                      {address.recipient}
                    </p>
                    <div className="mt-1 text-xs leading-5 text-bloom-muted">
                      <p>{address.addressLine1}</p>
                      {address.addressLine2 ? <p>{address.addressLine2}</p> : null}
                      <p>
                        {address.city}, {address.emirate}
                      </p>
                      {address.phone ? <p className="mt-1">{address.phone}</p> : null}
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2 border-t border-bloom-border pt-4">
                  {!address.isDefault ? (
                    <form action={setDefaultAddress}>
                      <input type="hidden" name="addressId" value={address.id} />
                      <button
                        type="submit"
                        className="h-9 border border-bloom-border bg-white px-3 text-[10px] font-semibold text-bloom-violet"
                      >
                        Make default
                      </button>
                    </form>
                  ) : null}

                  <form action={deleteAccountAddress}>
                    <input type="hidden" name="addressId" value={address.id} />
                    <button
                      type="submit"
                      className="h-9 border border-red-200 bg-white px-3 text-[10px] font-semibold text-red-600"
                    >
                      Remove
                    </button>
                  </form>
                </div>
              </article>
            ))
          ) : (
            <div className="border border-bloom-border bg-white px-5 py-10 text-center text-sm text-bloom-muted">
              No saved addresses yet.
            </div>
          )}
        </section>

        <section className="border border-bloom-border bg-white p-6">
          <h2 className="text-sm font-semibold text-bloom-plum">
            Add an address
          </h2>
          <p className="mt-1 text-[11px] text-bloom-muted">
            The first saved address automatically becomes your default.
          </p>

          <form action={addAccountAddress} className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field name="label" label="Label" placeholder="Home" />
            <Field name="recipient" label="Recipient" required />
            <Field name="phone" label="Phone" type="tel" />
            <Field name="city" label="City" required />
            <div className="sm:col-span-2">
              <Field name="addressLine1" label="Address" required />
            </div>
            <div className="sm:col-span-2">
              <Field
                name="addressLine2"
                label="Apartment, suite, or landmark"
              />
            </div>

            <label>
              <span className="text-xs font-semibold text-bloom-plum">
                Emirate
              </span>
              <select
                name="emirate"
                required
                className="mt-2 h-11 w-full border border-bloom-border bg-white px-3 text-sm outline-none focus:border-bloom-violet"
              >
                <option value="">Select emirate</option>
                {emirates.map((emirate) => (
                  <option key={emirate}>{emirate}</option>
                ))}
              </select>
            </label>

            <button
              type="submit"
              className="h-11 self-end bg-bloom-plum px-5 text-sm font-semibold text-white"
            >
              Save address
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  name: string;
}) {
  return (
    <label>
      <span className="text-xs font-semibold text-bloom-plum">{label}</span>
      <input
        name={name}
        type={type}
        {...props}
        className="mt-2 h-11 w-full border border-bloom-border bg-white px-3 text-sm outline-none focus:border-bloom-violet"
      />
    </label>
  );
}
