import { cn } from "@/lib/utils";

type BloomTone = "rose" | "violet" | "peach" | "cream" | "sun";

type BloomArtworkProps = {
  tone?: BloomTone;
  className?: string;
  compact?: boolean;
};

const toneClasses: Record<BloomTone, string> = {
  rose: "bg-[#f6dce8]", violet: "bg-[#e6dcf3]", peach: "bg-[#f9e2d9]",
  cream: "bg-[#f3eddc]", sun: "bg-[#f7edbc]",
};

const petalClasses: Record<BloomTone, string> = {
  rose: "bg-[#e85d9e]",
  violet: "bg-[#8b5cf6]",
  peach: "bg-[#ef8d7f]",
  cream: "bg-[#f1dfb8]",
  sun: "bg-[#f2c94c]",
};

export function BloomArtwork({
  tone = "rose",
  className,
  compact = false,
}: BloomArtworkProps) {
  return (
    <div
      className={cn(
        "relative isolate overflow-hidden",
        toneClasses[tone],
        className,
      )}
      aria-hidden="true"
    >

      <div
        className={cn(
          "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[44%]",
          compact ? "scale-[0.78]" : "scale-100",
        )}
      >
        <div className="relative h-72 w-56">
          <div className="absolute bottom-0 left-[44%] h-44 w-1.5 -rotate-6 rounded-full bg-[#678b66]" />
          <div className="absolute bottom-0 left-[57%] h-48 w-1.5 rotate-7 rounded-full bg-[#5f835f]" />
          <div className="absolute bottom-0 left-[32%] h-40 w-1.5 -rotate-12 rounded-full bg-[#73936f]" />

          <div className="absolute bottom-20 left-[28%] h-10 w-20 -rotate-[28deg] rounded-[100%_0_100%_0] bg-[#7c9f78]/90" />
          <div className="absolute bottom-28 left-[50%] h-10 w-20 rotate-[26deg] rounded-[0_100%_0_100%] bg-[#6f956d]/90" />
          <div className="absolute bottom-10 left-[38%] h-9 w-16 rotate-[16deg] rounded-[0_100%_0_100%] bg-[#86a67e]/80" />

          <Flower className="left-[10%] top-[34%] -rotate-12" tone={tone} />
          <Flower className="left-[39%] top-[10%] rotate-6 scale-110" tone={tone} />
          <Flower className="left-[58%] top-[35%] rotate-12 scale-90" tone={tone} />
        </div>
      </div>

      <div className="absolute inset-x-[12%] bottom-[8%] h-12 rounded-[50%] bg-[#553f50]/10 blur-xl" />
    </div>
  );
}

function Flower({
  className,
  tone,
}: {
  className?: string;
  tone: BloomTone;
}) {
  return (
    <div className={cn("absolute size-24", className)}>
      <div
        className={cn(
          "absolute left-[31%] top-0 h-12 w-9 rounded-[55%_55%_48%_48%] shadow-[inset_0_-7px_14px_rgba(255,255,255,0.18)]",
          petalClasses[tone],
        )}
      />
      <div
        className={cn(
          "absolute left-[5%] top-[28%] h-10 w-12 -rotate-[28deg] rounded-[58%_48%_52%_46%] shadow-[inset_0_-7px_14px_rgba(255,255,255,0.16)]",
          petalClasses[tone],
        )}
      />
      <div
        className={cn(
          "absolute right-[4%] top-[28%] h-10 w-12 rotate-[28deg] rounded-[48%_58%_46%_52%] shadow-[inset_0_-7px_14px_rgba(255,255,255,0.16)]",
          petalClasses[tone],
        )}
      />
      <div
        className={cn(
          "absolute bottom-[4%] left-[26%] h-11 w-11 rounded-[46%_46%_58%_58%] shadow-[inset_0_-7px_14px_rgba(255,255,255,0.14)]",
          petalClasses[tone],
        )}
      />
      <div className="absolute left-1/2 top-1/2 size-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#fff4be] shadow-inner" />
    </div>
  );
}
