import Link from "next/link";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/drills", label: "Practice Drills" },
];

export function NavHeader() {
  return (
    <header className="border-b border-felt-line">
      <nav className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
        <Link href="/" className="font-semibold tracking-tight text-gold-400">
          Card Counting Trainer
        </Link>
        <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-muted">
          {LINKS.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className="transition-colors hover:text-ink">
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
