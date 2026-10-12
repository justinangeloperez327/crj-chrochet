import Link from "next/link";
export const metadata = { title: "Verify Email", robots: { index: false, follow: false } };
export default async function VerifyEmail({
  searchParams,
}: { searchParams: Promise<{ token?: string; sent?: string; error?: string }> }) {
  const { token, sent, error } = await searchParams;
  return <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-12">
    <Link href="/" className="text-sm font-semibold text-bloom-violet">Handmade Blooms by CRJ</Link>
    <h1 className="mt-8 font-display text-4xl text-bloom-plum">Verify your email</h1>
    <p className="mt-3 text-sm text-bloom-muted">{error
      ? "This link is invalid or expired. Request a new one."
      : sent ? "If your registration or email request was accepted, a verification link is on its way."
      : "Confirm email ownership before accessing orders and saved addresses."}</p>
    {token ? <form method="post" action="/api/auth/verify" className="mt-6">
      <input type="hidden" name="token" value={token}/>
      <button className="h-11 w-full bg-bloom-plum px-4 text-sm font-semibold text-white" type="submit">Verify email</button>
    </form> : null}
    <form method="post" action="/api/auth/request-link" className="mt-6 space-y-3">
      <input type="hidden" name="kind" value="verify"/>
      <label className="block text-xs font-semibold text-bloom-plum">Email address
        <input required type="email" name="email" autoComplete="email" className="mt-2 h-11 w-full border border-bloom-border px-3 text-sm"/>
      </label>
      <button type="submit" className="h-11 w-full border border-bloom-border text-sm font-semibold text-bloom-violet">Resend verification</button>
    </form>
    <Link href="/login" className="mt-6 text-sm text-bloom-violet">Back to sign in</Link>
  </main>;
}
