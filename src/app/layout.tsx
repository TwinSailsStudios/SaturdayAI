import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Apex SAT",
  description:
    "Digital SAT/PSAT preparation built on a trap-first content engine and a deterministic roadmap.",
};

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/practice", label: "Practice" },
  { href: "/sim", label: "Test Sim" },
  { href: "/academy", label: "Desmos Academy" },
  { href: "/settings", label: "Tutor Key" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="border-b border-line bg-surface">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-6 py-4">
            <Link href="/" className="text-base font-semibold tracking-tight">
              Apex<span className="text-accent">SAT</span>
            </Link>
            <nav className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
              {NAV.slice(1).map((item) => (
                <Link key={item.href} href={item.href} className="hover:text-ink">
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
        <footer className="mx-auto max-w-5xl px-6 pb-12 pt-4 text-xs text-muted">
          Development build. The roadmap, scoring and calibration numbers are computed by the
          backend; the engine writes content only.
        </footer>
      </body>
    </html>
  );
}
