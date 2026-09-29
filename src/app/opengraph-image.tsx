import { ImageResponse } from "next/og";
import { site } from "@/content/site";

export const alt = site.meta.title;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Warna brand: sekunder (latar), primer (judul), ink (teks).
export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 80,
        background: "#F2E1D1",
        color: "#2B1A17",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ fontSize: 40, fontWeight: 700, color: "#74342B" }}>{site.name}</div>
      <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.15, color: "#74342B" }}>
        {site.hero.headline}
      </div>
      <div style={{ fontSize: 28 }}>{site.tagline}</div>
    </div>,
    size,
  );
}
