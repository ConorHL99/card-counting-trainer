import Link from "next/link";
import { auth } from "@/auth";
import { getUserSettings } from "@/lib/db/settings";
import { SettingsForm } from "@/components/SettingsForm";

export default async function SettingsPage() {
  const session = await auth();

  if (!session?.user) {
    return (
      <main className="mx-auto w-full max-w-[45rem] flex-1 px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Settings</h1>
        <section className="felt-panel mt-6 p-4 text-center">
          <p className="text-sm text-ink-muted">
            Defaults and account info are tied to your account — sign in from the nav to
            configure them.
          </p>
          <Link
            href="/drills"
            className="mt-4 inline-block rounded-card bg-felt-700 px-4 py-2 text-sm font-medium text-ink hover:bg-felt-800"
          >
            Practice without signing in
          </Link>
        </section>
      </main>
    );
  }

  const settings = await getUserSettings(session.user.id);

  return (
    <main className="mx-auto w-full max-w-[45rem] flex-1 px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Settings</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Defaults applied when you start a new drill, and your account info from PocketID.
      </p>

      <SettingsForm
        initialSettings={settings}
        accountName={session.user.name ?? null}
        accountEmail={session.user.email ?? null}
      />
    </main>
  );
}
