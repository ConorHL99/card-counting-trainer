"use client";

import { useState } from "react";
import { CountingSystemSelect } from "@/components/CountingSystemSelect";
import { SettingToggle } from "@/components/SettingToggle";
import { updateUserSettings } from "@/lib/db/settings-actions";
import type { UserSettingsValues } from "@/lib/db/settings";

interface SettingsFormProps {
  initialSettings: UserSettingsValues;
  accountName: string | null;
  accountEmail: string | null;
}

export function SettingsForm({ initialSettings, accountName, accountEmail }: SettingsFormProps) {
  const [settings, setSettings] = useState(initialSettings);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function handleSave() {
    setStatus("saving");
    try {
      await updateUserSettings(settings);
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  }

  return (
    <>
      <section className="felt-panel mt-6 flex flex-col gap-4 p-4">
        <h2 className="text-sm font-semibold text-ink">Drill defaults</h2>

        <div>
          <label htmlFor="default-system" className="mb-1 block text-sm font-medium text-ink">
            Default counting system
          </label>
          <CountingSystemSelect
            id="default-system"
            value={settings.defaultSystemId}
            onChange={(id) => {
              setSettings((prev) => ({ ...prev, defaultSystemId: id }));
              setStatus("idle");
            }}
          />
          <p className="mt-1 text-xs text-ink-muted">
            What a new drill starts with — still switchable per drill any time.
          </p>
        </div>

        <SettingToggle
          id="default-reveal-count"
          label="Reveal count, by default"
          checked={settings.defaultRevealCount}
          onChange={(v) => {
            setSettings((prev) => ({ ...prev, defaultRevealCount: v }));
            setStatus("idle");
          }}
          offHint="drills start with the count hidden"
          onHint="drills start with the count visible"
        />

        <SettingToggle
          id="default-reveal-correct-action"
          label="Reveal correct action, by default"
          checked={settings.defaultRevealCorrectAction}
          onChange={(v) => {
            setSettings((prev) => ({ ...prev, defaultRevealCorrectAction: v }));
            setStatus("idle");
          }}
          offHint="drills start with answers hidden"
          onHint="drills start with answers visible"
        />

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={status === "saving"}
            className="rounded-card bg-gold-500 px-5 py-2 font-medium text-felt-950 hover:bg-gold-400 disabled:opacity-60"
          >
            {status === "saving" ? "Saving…" : "Save"}
          </button>
          {status === "saved" && <span className="text-sm text-success">Saved.</span>}
          {status === "error" && (
            <span className="text-sm text-danger">Couldn&rsquo;t save — try again.</span>
          )}
        </div>
      </section>

      <section className="felt-panel mt-6 p-4">
        <h2 className="text-sm font-semibold text-ink">Account</h2>
        <dl className="mt-3 flex flex-col gap-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-ink-muted">Name</dt>
            <dd className="text-ink">{accountName ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-muted">Email</dt>
            <dd className="truncate text-ink">{accountEmail ?? "—"}</dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-ink-muted">
          Managed by PocketID — update your name, email, or password there. Sign out from the nav
          above.
        </p>
      </section>
    </>
  );
}
