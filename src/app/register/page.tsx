import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Create Account",
};

type RegisterPageProps = {
  searchParams: Promise<{
    error?: string;
    email?: string;
  }>;
};

export default async function RegisterPage({
  searchParams,
}: RegisterPageProps) {
  const params = await searchParams;

  return (
    <main className="grid min-h-screen bg-background lg:grid-cols-[0.9fr_1.1fr]">
      <section className="flex items-center justify-center px-5 py-12 sm:px-8">
        <div className="w-full max-w-md">
          <Link href="/" className="inline-flex items-baseline gap-2">
            <span className="font-display text-2xl font-semibold text-bloom-plum">
              Handmade Blooms
            </span>
            <span className="text-[9px] font-semibold tracking-[0.18em] text-bloom-pink uppercase">
              by CRJ
            </span>
          </Link>

          <p className="mt-12 text-[10px] font-semibold tracking-[0.16em] text-bloom-pink uppercase">
            Your account
          </p>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-[-0.04em] text-bloom-plum">
            Save the blooms you love.
          </h1>
          <p className="mt-3 text-sm leading-6 text-bloom-muted">
            Create an account for order history, addresses, and a persistent wishlist.
          </p>

          {params.error ? (
            <p className="mt-6 border border-red-200 bg-red-50 px-4 py-3 text-xs leading-5 text-red-700">
              {params.error}
            </p>
          ) : null}

          <form method="post" action="/api/auth/register" className="mt-7 space-y-4">
            <Field
              label="Full name"
              name="name"
              type="text"
              autoComplete="name"
              required
            />
            <Field
              label="Email address"
              name="email"
              type="email"
              autoComplete="email"
              defaultValue={params.email ?? ""}
              required
            />
            <Field
              label="Password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={12}
              required
            />
            <p className="-mt-1 text-[11px] text-bloom-muted">
              Use at least 12 characters.
            </p>

            <button
              type="submit"
              className="h-12 w-full bg-bloom-plum px-5 text-sm font-semibold text-white"
            >
              Create account
            </button>
          </form>

          <p className="mt-6 text-sm text-bloom-muted">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-bloom-violet">
              Sign in
            </Link>
          </p>
        </div>
      </section>

      <section className="hidden bg-[#fff0f6] lg:flex lg:items-end lg:p-12">
        <div className="max-w-lg">
          <p className="font-display text-5xl font-semibold leading-tight tracking-[-0.045em] text-bloom-plum">
            Handmade gifts.
            <span className="block text-bloom-violet">Remembered longer.</span>
          </p>
        </div>
      </section>
    </main>
  );
}

function Field({
  label,
  name,
  type,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  name: string;
  type: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-bloom-plum">{label}</span>
      <input
        name={name}
        type={type}
        {...props}
        className="mt-2 h-12 w-full border border-bloom-border bg-white px-3 text-sm text-bloom-plum outline-none focus:border-bloom-violet"
      />
    </label>
  );
}
