import Link from "next/link";

const steps = [
  "Connect your wallet.",
  "Pick a .eth name you own.",
  "Edit your HTML, CSS, and JS in-browser.",
  "Hit publish — uploads to IPFS and writes the ENS record.",
];

export default function Home() {
  return (
    <main className="app-shell relative overflow-hidden">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-5 py-5 lg:px-8">
        <header className="glass-panel relative flex items-center justify-between rounded-full px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="grid size-12 place-items-center rounded-full bg-[var(--ink)] text-sm font-semibold text-white shadow-[0_16px_32px_rgba(18,18,15,0.24)]">
              sx
            </div>
            <div>
              <p className="text-lg font-semibold tracking-tight text-zinc-950">sites.xyz</p>
              <p className="text-sm text-zinc-500">ENS static site publisher</p>
            </div>
          </div>

          <Link
            href="/app"
            className="inline-flex items-center justify-center rounded-full bg-[var(--ink)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_18px_34px_rgba(18,18,15,0.18)] transition hover:-translate-y-0.5 hover:bg-black"
          >
            Open app
          </Link>
        </header>

        <section className="grid flex-1 items-center gap-12 py-16 lg:grid-cols-2 lg:py-20">
          {/* Left: copy */}
          <div>
            <div className="inline-flex rounded-full border border-emerald-300/60 bg-white/80 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.32em] text-emerald-900 shadow-[0_14px_26px_rgba(37,79,53,0.08)] backdrop-blur">
              .eth sites on IPFS
            </div>

            <h1 className="mt-7 text-5xl font-semibold leading-[0.94] tracking-[-0.05em] text-zinc-950 sm:text-6xl lg:text-7xl">
              Deploy a decentralised site to your .eth name.
            </h1>

            <p className="mt-6 max-w-lg text-lg leading-8 text-zinc-600">
              Build a static site in-browser, preview it live, then publish — we upload to IPFS and write the ENS contenthash so your site opens at{" "}
              <code className="rounded bg-emerald-100 px-1.5 py-0.5 text-sm text-emerald-800">yourname.eth.limo</code>.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/app"
                className="inline-flex items-center justify-center rounded-full bg-[var(--ink)] px-7 py-3.5 text-sm font-semibold text-white shadow-[0_20px_36px_rgba(18,18,15,0.18)] transition hover:-translate-y-0.5 hover:bg-black"
              >
                Launch builder →
              </Link>
              <a
                href="https://docs.ens.domains/dweb/intro/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-full border border-zinc-300/80 bg-white/82 px-7 py-3.5 text-sm font-medium text-zinc-700 shadow-[0_14px_28px_rgba(16,24,19,0.06)] transition hover:border-emerald-300 hover:bg-emerald-50"
              >
                How ENS hosting works
              </a>
            </div>
          </div>

          {/* Right: steps */}
          <div className="ink-panel grain relative overflow-hidden rounded-[2.5rem] p-7">
            <p className="text-xs uppercase tracking-[0.3em] text-emerald-200/70">How it works</p>
            <div className="mt-5 space-y-3">
              {steps.map((step, index) => (
                <div
                  key={step}
                  className="flex items-start gap-4 rounded-2xl border border-white/8 bg-white/5 px-4 py-4"
                >
                  <div className="grid size-8 shrink-0 place-items-center rounded-full bg-white text-xs font-bold text-zinc-950">
                    {index + 1}
                  </div>
                  <p className="pt-0.5 text-sm leading-6 text-white/80">{step}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/8 bg-white/5 px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/40">Supported</p>
                <p className="mt-2 text-sm text-white/80">HTML · CSS · JS · images · fonts</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/5 px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/40">Not supported</p>
                <p className="mt-2 text-sm text-white/80">React · Next.js · npm builds</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
