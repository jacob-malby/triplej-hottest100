import QRCode from "qrcode";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const data = searchParams.get("data") || "";

  if (!data) {
    return new Response("Missing ?data=", { status: 400 });
  }

  // Optional: allow ?size=360, clamp to a sensible range
  const requested = Number(searchParams.get("size") ?? 360);
  const size = Number.isFinite(requested) ? Math.max(256, Math.min(1024, requested)) : 360;

  // Force a square QR PNG
  const pngBuffer = await QRCode.toBuffer(data, {
    type: "png",
    width: size, // ✅ guarantees square output
    margin: 2,
    errorCorrectionLevel: "M",
    color: { dark: "#000000", light: "#FFFFFF" },
  });

  // Buffer -> Uint8Array so TS + Web Response types are happy
  const body = new Uint8Array(pngBuffer);

  return new Response(body, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-store, max-age=0",
      "Content-Disposition": 'inline; filename="qr.png"',
    },
  });
}