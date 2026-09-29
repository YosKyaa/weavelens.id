/** Garis tipis di atas layar yang memanjang mengikuti posisi scroll. Murni CSS. */
export function ScrollProgress() {
  return (
    <div
      aria-hidden
      className="scroll-progress pointer-events-none fixed inset-x-0 top-0 z-50 h-[3px] bg-primary"
    />
  );
}
