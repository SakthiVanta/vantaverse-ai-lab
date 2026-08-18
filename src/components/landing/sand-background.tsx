export function SandBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 bg-background">
      <div className="sand-grain absolute inset-0" />
    </div>
  );
}
