import Link from "next/link";
import { auth, signIn, signOut } from "@/auth";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/theory", label: "Theory" },
  { href: "/drills", label: "Practice Drills" },
  { href: "/play", label: "Play Mode" },
  { href: "/stats", label: "Stats" },
  { href: "/settings", label: "Settings" },
];

export async function NavHeader() {
  const session = await auth();

  return (
    <header className="border-b border-felt-line">
      <nav className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
        <Link href="/" className="font-semibold tracking-tight text-gold-400">
          Card Counting Trainer
        </Link>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
          <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-muted">
            {LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="transition-colors hover:text-ink">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          {session?.user ? (
            <form
              action={async () => {
                "use server";
                await signOut();
              }}
            >
              <button type="submit" className="text-sm text-ink-muted hover:text-ink">
                Sign out{session.user.name ? ` (${session.user.name})` : ""}
              </button>
            </form>
          ) : (
            <form
              action={async () => {
                "use server";
                await signIn("pocketid");
              }}
            >
              <button
                type="submit"
                className="rounded-card bg-gold-500 px-3 py-1 text-sm font-medium text-felt-950 hover:bg-gold-400"
              >
                Sign in
              </button>
            </form>
          )}
        </div>
      </nav>
    </header>
  );
}
