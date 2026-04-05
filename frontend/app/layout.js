import "./globals.css";

export const metadata = {
  title: "FlipperIQ",
  description: "Pinball coaching and performance analysis."
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
