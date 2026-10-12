import Link from "next/link";
export const metadata = { title: "Forgot Password", robots: { index: false, follow: false } };
export default async function ForgotPassword({
  searchParams,
}: { searchParams: Promise<{ sent?: string; error?: string }> }) {
  const params = await searchParams;
  return <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-12">
    <Link href="/" className="text-sm font-semibold text-bloom-violet">Handmade Blooms by CRJ</Link>
    <h1 className="mt-8 font-display text-4xl text-bloom-plum">Reset your password</h1>
    <p className="mt-3 text-sm text-bloom-muted">{params.sent
      ? "If an account exists for that email, a reset link has been sent."
      : params.error ? "The reset link expired or was invalid. Request another."
      : "We'll email a one-time password reset link."}</p>
    <form method="post" action="/api/auth/request-link" className="mt-7 space-y-4">
      <input type="hidden" name="kind" value="reset"/>
      <label className="block text-xs font-semibold text-bloom-plum">Email address
        <input name="email" type="email" required autoComplete="email" className="mt-2 h-11 w-full border border-bloom-border px-3 text-sm"/>
      </label>
      <button className="h-11 w-full bg-bloom-plum px-4 text-sm font-semibold text-white">Send reset link</button>
    </form>
    <Link href="/login" className="mt-6 text-sm text-bloom-violet">Back to sign in</Link>
  </main>;
}
