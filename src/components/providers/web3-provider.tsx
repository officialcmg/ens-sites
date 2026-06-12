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
      //
      // NOTE: cloudflare-eth.com ("Cannot fulfill request") and
      // rpc.ankr.com ("Unauthorized" — now needs an API key) are dead for
      // anonymous browser use. Keeping them in the fallback list made every
      // request burn seconds failing through them first, which is why
      // tx confirmation felt eternal. Only verified-working endpoints below.
      [mainnet.id]: process.env.NEXT_PUBLIC_MAINNET_RPC_URL
        ? http(process.env.NEXT_PUBLIC_MAINNET_RPC_URL)
        : fallback(
            [
              http("https://ethereum.publicnode.com", { timeout: 6_000, retryCount: 1 }),
              http("https://eth.drpc.org", { timeout: 6_000, retryCount: 1 }),
              http("https://1rpc.io/eth", { timeout: 8_000, retryCount: 1 }),
            ],
            { retryCount: 2 },
          ),
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
            // "PRESS" neo-brutalist: square corners, hard offset shadows,
            // ink/cream/emerald palette. Matches the app + landing page.
            "--ck-font-family": "var(--font-sans)",
            "--ck-border-radius": "0px",
            "--ck-connectbutton-border-radius": "0px",
            "--ck-primary-button-border-radius": "0px",
            "--ck-secondary-button-border-radius": "0px",
            "--ck-tertiary-button-border-radius": "0px",
            "--ck-qr-border-radius": "0px",
            "--ck-overlay-background": "rgba(18, 18, 15, 0.45)",
            "--ck-connectbutton-background": "#12120f",
            "--ck-connectbutton-color": "#ffffff",
            "--ck-connectbutton-hover-background": "#1d5f3d",
            "--ck-connectbutton-active-background": "#12120f",
            "--ck-connectbutton-box-shadow":
              "inset 0 0 0 2px #12120f, 3px 3px 0 #2d8a57",
            "--ck-connectbutton-hover-box-shadow":
              "inset 0 0 0 2px #12120f, 3px 3px 0 #2d8a57",
            "--ck-connectbutton-active-box-shadow":
              "inset 0 0 0 2px #12120f, 1px 1px 0 #2d8a57",
            "--ck-accent-color": "#2d8a57",
            "--ck-accent-text-color": "#ffffff",
            "--ck-body-background": "#fffcf7",
            "--ck-body-background-secondary": "#ece8de",
            "--ck-body-background-tertiary": "#ece8de",
            "--ck-body-color": "#12120f",
            "--ck-body-color-muted": "rgba(18, 18, 15, 0.6)",
            "--ck-body-divider": "rgba(18, 18, 15, 0.15)",
            "--ck-body-disclaimer-background": "#ece8de",
            "--ck-body-disclaimer-color": "rgba(18, 18, 15, 0.6)",
            "--ck-modal-box-shadow": "0 0 0 2px #12120f, 8px 8px 0 #12120f",
            "--ck-primary-button-background": "#12120f",
            "--ck-primary-button-color": "#ffffff",
            "--ck-primary-button-hover-background": "#1d5f3d",
            "--ck-primary-button-box-shadow": "0 0 0 2px #12120f",
            "--ck-primary-button-hover-box-shadow": "0 0 0 2px #12120f",
            "--ck-secondary-button-background": "#fffcf7",
            "--ck-secondary-button-color": "#12120f",
            "--ck-secondary-button-hover-background": "#fff64f",
            "--ck-secondary-button-box-shadow": "0 0 0 2px #12120f",
            "--ck-secondary-button-hover-box-shadow": "0 0 0 2px #12120f",
            "--ck-tooltip-background": "#12120f",
            "--ck-tooltip-color": "#ffffff",
            "--ck-focus-color": "#2d8a57",
            "--ck-qr-dot-color": "#12120f",
            "--ck-qr-background": "#ffffff",
          }}
        >
          {children}
        </ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
