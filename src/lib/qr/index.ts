import QRCode from "qrcode";

export function generateQRToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return "tbl_" + Array.from(array).map((b) => chars[b % chars.length]).join("");
}

export function getTableUrl(token: string): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || (typeof window !== "undefined" ? window.location.origin : "")).replace(/\/$/, "");
  return `${base}/table/${token}`;
}

export async function generateQRDataUrl(token: string): Promise<string> {
  const url = getTableUrl(token);
  return QRCode.toDataURL(url, {
    width: 300,
    margin: 2,
    color: { dark: "#1a1a1a", light: "#ffffff" },
  });
}

export async function printQR(
  tableNumber: number,
  restaurantName: string,
  token: string
): Promise<void> {
  const dataUrl = await generateQRDataUrl(token);
  const url = getTableUrl(token);
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(`
    <html><head><title>Table ${tableNumber} QR</title>
    <style>
      body { font-family: sans-serif; text-align: center; padding: 40px; }
      img { width: 250px; height: 250px; }
      h1 { font-size: 24px; margin-bottom: 4px; }
      h2 { font-size: 18px; color: #555; margin-bottom: 20px; }
      p { font-size: 12px; color: #888; margin-top: 12px; }
    </style></head>
    <body>
      <h1>${restaurantName}</h1>
      <h2>Table ${tableNumber}</h2>
      <img src="${dataUrl}" alt="QR Code" />
      <p>Scan to Order</p>
      <p style="font-size:10px">${url}</p>
      <script>window.onload=()=>{window.print();window.close();}<\/script>
    </body></html>
  `);
  win.document.close();
}
