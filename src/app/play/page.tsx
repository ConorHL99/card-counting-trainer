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
    <PlayModeView
      initialSystemId={settings?.defaultSystemId ?? "hi-lo"}
      initialBankroll={bankroll}
      signedIn={!!userId}
    />
  );
}
