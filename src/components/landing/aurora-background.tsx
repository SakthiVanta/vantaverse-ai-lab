export function AuroraBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-background">
      <div className="bg-grid absolute inset-0" />
      <div className="absolute left-1/2 top-[-10%] h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-vv-violet/25 blur-[120px] animate-[pulse_8s_ease-in-out_infinite]" />
      <div className="absolute right-[-10%] top-[20%] h-[420px] w-[420px] rounded-full bg-vv-magenta/20 blur-[120px] animate-[pulse_10s_ease-in-out_infinite]" />
      <div className="absolute left-[-10%] bottom-[0%] h-[480px] w-[480px] rounded-full bg-vv-cyan/15 blur-[130px] animate-[pulse_12s_ease-in-out_infinite]" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
    </div>
  );
}
