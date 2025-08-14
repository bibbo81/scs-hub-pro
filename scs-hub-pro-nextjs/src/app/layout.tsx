import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SCS Hub Pro - Supply Chain Management",
  description: "Transform your supply chain chaos into clarity. Real-time tracking, intelligent insights, and seamless logistics management - all in one powerful platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <body className="min-h-screen bg-gray-50 antialiased">
        {children}
      </body>
    </html>
  );
}
