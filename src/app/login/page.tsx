import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sign In",
};

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
    next?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const next = params.next?.startsWith("/") ? params.next : "/account";

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

          <p className="mt-12 text-[10px] font-semibold tracking-[0.16em] text-bloom-violet uppercase">
            Welcome back
          </p>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-[-0.04em] text-bloom-plum">
            Sign in to your account.
          </h1>
          <p className="mt-3 text-sm leading-6 text-bloom-muted">
            View orders, saved addresses, and your wishlist.
          </p>

          {params.error ? (
            <p className="mt-6 border border-red-200 bg-red-50 px-4 py-3 text-xs leading-5 text-red-700">
              {params.error}
            </p>
          ) : null}

          <form method="post" action="/api/auth/login" className="mt-7 space-y-4">
            <input type="hidden" name="next" value={next} />

            <Field
              label="Email address"
              name="email"
              type="email"
              autoComplete="email"
              required
            />
            <Field
              label="Password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />

            <button
              type="submit"
              className="h-12 w-full bg-bloom-plum px-5 text-sm font-semibold text-white"
            >
              Sign in
            </button>
          </form>

          <p className="mt-6 text-sm text-bloom-muted">
            New here?{" "}
            <Link href="/register" className="font-semibold text-bloom-violet">
              Create an account
            </Link>
          </p>
        </div>
      </section>

      <section className="hidden bg-[#eee5fb] lg:flex lg:items-end lg:p-12">
        <div className="max-w-lg">
          <p className="font-display text-5xl font-semibold leading-tight tracking-[-0.045em] text-bloom-plum">
            Keep the blooms.
            <span className="block text-bloom-pink">Keep the moments.</span>
          </p>
          <p className="mt-5 text-sm leading-6 text-bloom-muted">
            Your account keeps your order history and favorite handmade arrangements in one place.
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
