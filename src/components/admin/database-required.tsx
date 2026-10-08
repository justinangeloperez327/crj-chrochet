import { Database } from "lucide-react";

export function DatabaseRequired() {
  return (
    <div className="border border-bloom-border bg-white p-8 sm:p-10">
      <div className="flex size-11 items-center justify-center bg-bloom-violet-soft text-bloom-violet">
        <Database className="size-5" />
      </div>
      <h1 className="mt-5 font-display text-3xl font-semibold tracking-[-0.04em] text-bloom-plum">
        Connect PostgreSQL to use the admin.
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-bloom-muted">
        The customer storefront can fall back to static products, but inventory,
        orders, and product administration require a real database. Configure
        DATABASE_URL, apply the Prisma migration, and seed the catalog first.
      </p>
      <div className="mt-6 border border-bloom-border bg-[#faf8fa] p-4 font-mono text-xs leading-6 text-bloom-muted">
        npm run db:migrate -- --name initial-commerce-schema
        <br />
        npm run db:seed
      </div>
    </div>
  );
}
