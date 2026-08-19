"use client";

interface SettingToggleProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Short phrase for the off state, e.g. "hidden". Rendered as
   * "Off: {offHint} · On: {onHint}" — the one fixed phrasing
   * convention every toggle in the app uses (SPEC.md §7.1). */
  offHint: string;
  onHint: string;
  disabled?: boolean;
}

/**
 * The one toggle component used everywhere a setting is switched on
 * or off — reveal count / reveal correct action (CLAUDE.md rule #5),
 * seat count, seat skill, drill mode, etc. Every toggle explains its
 * tradeoff via the same compact `offHint`/`onHint` pattern (rule #10)
 * instead of a one-off explanation per instance.
 */
export function SettingToggle({
  id,
  label,
  checked,
  onChange,
  offHint,
  onHint,
  disabled,
}: SettingToggleProps) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <div className="min-w-0">
        <label htmlFor={id} className="block text-sm font-medium text-ink">
          {label}
        </label>
        <p className="text-xs text-ink-muted">
          Off: {offHint} · On: {onHint}
        </p>
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-40 ${
          checked ? "bg-gold-500" : "bg-felt-700"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-card transition-transform ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}
