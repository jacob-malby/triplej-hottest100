import QRCode from "qrcode";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const data = searchParams.get("data") || "";

  if (!data) {
    return new Response("Missing data", { status: 400 });
  }

  const pngBuffer = await QRCode.toBuffer(data, { type: "png", margin: 1, scale: 8 });

  return new Response(pngBuffer, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-store",
    },
  });
}