import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NEXORA AI",
  description: "Autonomous Local-First Multi-Agent Intelligence System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full w-full">
      <body className="h-full w-full bg-[#fbf9f5] text-[#2d2a26] flex overflow-hidden antialiased select-none">
        {children}
      </body>
    </html>
  );
}
