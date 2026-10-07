import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";

const stack = [
  "Next.js 16.4.0",
  "React 19.3.0",
  "TypeScript 7.0.2",
  "Tailwind CSS 4.3.3",
  "shadcn/ui",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-background px-6 py-16 text-foreground">
      <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-3xl items-center">
        <section className="w-full space-y-8">
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">
              CRJ Chrochet
            </p>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              Project foundation is ready.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-muted-foreground">
              A clean App Router foundation with TypeScript, Tailwind CSS, and
              shadcn/ui configured for the next implementation groups.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {stack.map((item) => (
              <div
                key={item}
                className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 text-sm text-card-foreground"
              >
                <CheckCircle2 className="size-4 text-muted-foreground" />
                <span>{item}</span>
              </div>
            ))}
          </div>

          <Button type="button">Start building</Button>
        </section>
      </div>
    </main>
  );
}
