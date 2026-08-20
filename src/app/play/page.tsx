import { Suspense } from "react";
import { auth } from "@/auth";
import { getUserSettings } from "@/lib/db/settings";
import { getStartingBankroll, DEFAULT_STARTING_BANKROLL } from "@/lib/db/play-persistence";
import { PlayModeView } from "@/components/PlayModeView";

export default async function PlayPage() {
  const session = await auth();
  const userId = session?.user?.id;

  const [settings, bankroll] = userId
    ? await Promise.all([getUserSettings(userId), getStartingBankroll(userId)])
    : [null, DEFAULT_STARTING_BANKROLL];

  return (
    // PlayModeView reads `?system=` (set by the Dashboard's picker)
    // via useInitialSystemId, which needs a Suspense boundary — same
    // requirement as every drill page.
    <Suspense fallback={null}>
      <PlayModeView
        defaultSystemId={settings?.defaultSystemId ?? "hi-lo"}
        initialBankroll={bankroll}
        signedIn={!!userId}
      />
    </Suspense>
  );
}
