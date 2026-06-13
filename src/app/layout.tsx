import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Web3Provider } from "@/components/providers/web3-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "sites.xyz",
  description: "Build and publish static ENS websites to IPFS.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <Web3Provider>{children}</Web3Provider>
        <Analytics />
      </body>
    </html>
  );
}
