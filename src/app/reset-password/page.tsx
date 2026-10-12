import Link from "next/link";
export const metadata = { title: "Set New Password", robots: { index: false, follow: false } };
export default async function ResetPassword({
  searchParams,
}: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-12">
    <Link href="/" className="text-sm font-semibold text-bloom-violet">Handmade Blooms by CRJ</Link>
    <h1 className="mt-8 font-display text-4xl text-bloom-plum">Choose a new password</h1>
    {token ? <form action="/api/auth/reset" method="post" className="mt-7 space-y-4">
      <input type="hidden" name="token" value={token}/>
      <label className="block text-xs font-semibold text-bloom-plum">New password (12+ characters)
        <input name="password" type="password" minLength={12} maxLength={200} required autoComplete="new-password" className="mt-2 h-11 w-full border border-bloom-border px-3 text-sm"/>
      </label>
      <button className="h-11 w-full bg-bloom-plum px-4 text-sm font-semibold text-white">Reset password</button>
    </form> : <p className="mt-3 text-sm text-bloom-muted">Missing reset token. Request a new link.</p>}
    <Link href="/forgot-password" className="mt-6 text-sm text-bloom-violet">Request a new link</Link>
  </main>;
}
