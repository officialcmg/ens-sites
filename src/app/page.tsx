import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  FileCode2,
  Globe,
  Rocket,
  Wallet,
  X,
} from "lucide-react";

/**
 * Landing page — "PRESS" neo-brutalist theme.
 * Chunky 2px ink borders, hard offset shadows, flat cream/ink/emerald
 * palette, oversized black type. Matches /app/v4.
 */

const BOX = "border-2 border-[#12120f] bg-[#fffcf7]";
const SHADOW = "shadow-[5px_5px_0_#12120f]";
const PRESS =
  "transition-all active:translate-x-[3px] active:translate-y-[3px] active:shadow-[2px_2px_0_#12120f]";

const steps = [
  {
    icon: Wallet,
    title: "Connect",
    text: "Connect your wallet. Mainnet only — this is the real deal.",
    color: "#2d8a57",
  },
  {
    icon: Globe,
    title: "Pick a name",
    text: "Choose a .eth name you own. That's your domain now.",
    color: "#fff64f",
  },
  {
    icon: FileCode2,
    title: "Build",
    text: "Write HTML, CSS and JS in the browser. Live preview, zero setup.",
    color: "#fffcf7",
  },
  {
    icon: Rocket,
    title: "Publish",
    text: "One click: site goes to IPFS, contenthash goes on-chain. Done.",
    color: "#1d5f3d",
  },
];

const supported = ["HTML", "CSS", "JavaScript", "Images", "Fonts"];
const notSupported = ["React", "Next.js", "npm builds", "Server code"];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#ece8de] text-[#12120f]">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6 sm:px-6">

        {/* ============ HEADER ============ */}
        <header className={`${BOX} ${SHADOW} flex flex-wrap items-center justify-between gap-4 px-5 py-4`}>
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center border-2 border-[#12120f] bg-[#2d8a57] text-sm font-black text-white shadow-[3px_3px_0_#12120f]">
              SX
            </div>
            <div>
              <p className="text-xl font-black uppercase tracking-tight">sites.xyz</p>
              <p className="text-xs font-medium text-[#12120f]/60">ENS static site publisher</p>
            </div>
          </div>

          <Link
            href="/app"
            className={`inline-flex items-center gap-2 border-2 border-[#12120f] bg-[#12120f] px-5 py-2.5 text-sm font-black uppercase tracking-wide text-white ${PRESS} shadow-[4px_4px_0_#2d8a57] hover:bg-[#1d5f3d]`}
          >
            Open app
            <ArrowRight className="size-4" />
          </Link>
        </header>

        {/* ============ HERO ============ */}
        <section className="grid flex-1 items-center gap-10 py-14 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">

          {/* Left: copy */}
          <div>
            <div className="inline-flex items-center gap-2 border-2 border-[#12120f] bg-[#fff64f] px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.2em] shadow-[3px_3px_0_#12120f]">
              <span className="size-2 bg-[#12120f]" />
              .eth sites on IPFS
            </div>

            <h1 className="mt-7 text-5xl font-black uppercase leading-[0.92] tracking-tight sm:text-6xl lg:text-7xl">
              Your .eth name
              <br />
              <span className="bg-[#2d8a57] px-2 text-[#fffcf7] [box-decoration-break:clone]">
                is a website.
              </span>
            </h1>

            <p className="mt-7 max-w-lg text-base font-medium leading-7 text-[#12120f]/70 sm:text-lg">
              Build a static site in your browser, preview it live, hit publish. We pin it to IPFS
              and write the ENS contenthash so it opens at{" "}
              <code className="border-2 border-[#12120f] bg-[#fffcf7] px-1.5 py-0.5 font-mono text-sm font-bold">
                yourname.eth.limo
              </code>
              . No servers. No build steps. No gatekeepers.
            </p>

            <div className="mt-9 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/app"
                className={`inline-flex items-center justify-center gap-2.5 border-2 border-[#12120f] bg-[#2d8a57] px-7 py-4 text-base font-black uppercase tracking-widest text-white ${PRESS} shadow-[5px_5px_0_#12120f] hover:bg-[#1d5f3d]`}
              >
                Launch builder
                <ArrowRight className="size-5" />
              </Link>
              <a
                href="https://docs.ens.domains/dweb/intro/"
                target="_blank"
                rel="noreferrer"
                className={`inline-flex items-center justify-center gap-2.5 border-2 border-[#12120f] bg-[#fffcf7] px-7 py-4 text-base font-black uppercase tracking-widest ${PRESS} shadow-[5px_5px_0_#12120f] hover:bg-[#fff64f]`}
              >
                How it works
                <ArrowUpRight className="size-5" />
              </a>
            </div>

            {/* Supported / not supported */}
            <div className="mt-10 grid max-w-lg grid-cols-2 gap-4">
              <div className={`${BOX} shadow-[4px_4px_0_#12120f]`}>
                <p className="border-b-2 border-[#12120f] bg-[#2d8a57] px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white">
                  Supported
                </p>
                <ul className="space-y-1 p-3">
                  {supported.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm font-bold">
                      <Check className="size-3.5 text-[#1d5f3d]" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className={`${BOX} shadow-[4px_4px_0_#12120f]`}>
                <p className="border-b-2 border-[#12120f] bg-[#12120f] px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white">
                  Not supported
                </p>
                <ul className="space-y-1 p-3">
                  {notSupported.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm font-bold text-[#12120f]/60">
                      <X className="size-3.5 text-rose-500" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Right: steps stack */}
          <div className="relative">
            <div className={`${BOX} ${SHADOW}`}>
              <div className="flex items-center justify-between border-b-2 border-[#12120f] bg-[#12120f] px-4 py-3">
                <h2 className="text-sm font-black uppercase tracking-widest text-white">
                  How it works
                </h2>
                <span className="border-2 border-white/30 px-2 py-0.5 font-mono text-[11px] text-white/70">
                  4 steps
                </span>
              </div>

              <div>
                {steps.map((step, index) => {
                  const Icon = step.icon;
                  const darkChip = step.color === "#12120f" || step.color === "#1d5f3d" || step.color === "#2d8a57";
                  return (
                    <div
                      key={step.title}
                      className="flex items-start gap-4 border-b-2 border-[#12120f] px-4 py-4 last:border-b-0"
                    >
                      <div
                        className="grid size-11 shrink-0 place-items-center border-2 border-[#12120f] shadow-[3px_3px_0_#12120f]"
                        style={{ background: step.color }}
                      >
                        <Icon className={`size-5 ${darkChip ? "text-white" : "text-[#12120f]"}`} />
                      </div>
                      <div>
                        <p className="flex items-center gap-2 text-sm font-black uppercase tracking-wide">
                          <span className="font-mono text-[#12120f]/40">0{index + 1}</span>
                          {step.title}
                        </p>
                        <p className="mt-1 text-sm font-medium leading-6 text-[#12120f]/65">
                          {step.text}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="border-t-2 border-[#12120f] bg-[#fff64f] px-4 py-3">
                <p className="font-mono text-xs font-bold">
                  $ publish → ipfs://… → yourname.eth.limo ✓
                </p>
              </div>
            </div>

            {/* decorative offset block */}
            <div className="absolute -bottom-4 -right-4 -z-10 hidden h-24 w-24 border-2 border-[#12120f] bg-[#2d8a57] lg:block" />
            <div className="absolute -top-4 -left-4 -z-10 hidden h-16 w-16 border-2 border-[#12120f] bg-[#fff64f] lg:block" />
          </div>
        </section>

        {/* ============ FOOTER ============ */}
        <footer className="flex flex-wrap items-center justify-between gap-2 border-t-2 border-[#12120f] py-4">
          <p className="font-mono text-xs font-bold text-[#12120f]/50">
            sites.xyz — static sites on ENS + IPFS
          </p>
          <p className="flex items-center gap-1.5 font-mono text-xs font-bold text-[#12120f]/50">
            <span className="size-2 bg-[#2d8a57]" />
            decentralised &amp; unstoppable
          </p>
        </footer>
      </div>
    </main>
  );
}
