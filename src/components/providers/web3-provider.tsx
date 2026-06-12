"use client";

import { ReactNode, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConnectKitProvider, getDefaultConfig } from "connectkit";
import { createConfig, fallback, http, WagmiProvider } from "wagmi";
import { mainnet } from "wagmi/chains";

const config = createConfig(
  getDefaultConfig({
    appName: "sites.xyz",
    appDescription: "Build, publish, and point a static site from ENS to IPFS.",
    appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://127.0.0.1:3000",
    walletConnectProjectId:
      process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ||
      "WALLETCONNECT_PROJECT_ID_MISSING",
    enableAaveAccount: false,
    ssr: true,
    chains: [mainnet],
    transports: {
      // eth.merkle.io (wagmi default) blocks CORS from browser origins.
      // Use CORS-friendly public RPCs instead.
      [mainnet.id]: process.env.NEXT_PUBLIC_MAINNET_RPC_URL
        ? http(process.env.NEXT_PUBLIC_MAINNET_RPC_URL)
        : fallback([
            http("https://cloudflare-eth.com"),
            http("https://rpc.ankr.com/eth"),
            http("https://ethereum.publicnode.com"),
          ]),
    },
  }),
);

export function Web3Provider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider
          mode="light"
          customTheme={{
            "--ck-font-family": "var(--font-sans)",
            "--ck-border-radius": "999px",
            "--ck-overlay-backdrop-filter": "blur(14px)",
            "--ck-connectbutton-background": "#0a0a0a",
            "--ck-connectbutton-color": "#ffffff",
            "--ck-connectbutton-hover-background": "#1c1c1c",
            "--ck-connectbutton-active-background": "#111111",
            "--ck-connectbutton-box-shadow":
              "0 18px 36px rgba(10, 10, 10, 0.22)",
            "--ck-accent-color": "#0a0a0a",
            "--ck-accent-text-color": "#ffffff",
            "--ck-body-background": "#f6fbf6",
            "--ck-body-color": "#101813",
            "--ck-body-color-muted": "#5f6d64",
            "--ck-body-divider": "rgba(16, 24, 19, 0.08)",
            "--ck-body-disclaimer-background": "#edf6ee",
            "--ck-body-disclaimer-color": "#4a5a50",
            "--ck-primary-button-background": "#0a0a0a",
            "--ck-primary-button-color": "#ffffff",
            "--ck-primary-button-hover-background": "#181818",
            "--ck-secondary-button-background": "#ecf5ec",
            "--ck-secondary-button-color": "#101813",
            "--ck-secondary-button-hover-background": "#e3eee4",
            "--ck-tooltip-background": "#0a0a0a",
            "--ck-tooltip-color": "#ffffff",
            "--ck-focus-color": "#59b67c",
          }}
        >
          {children}
        </ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
