import { button } from "@/components/ui";

/**
 * The one field that opens anyone's recap. A plain GET form, so it works before (or without)
 * JavaScript: /go cleans up the name and redirects to /<username> (ruling R4). The border is
 * muted grey, 6.1:1 on the canvas, so the field reads as a field.
 */
export function UsernameForm({ id, label = "GitHub username" }: { id: string; label?: string }) {
  return (
    <form action="/go" method="get" className="flex w-full max-w-lg flex-col gap-2">
      <label htmlFor={id} className="text-base font-semibold">
        {label}
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          id={id}
          name="u"
          type="text"
          required
          maxLength={100}
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="min-h-11 min-w-0 flex-1 rounded-[var(--radius-control)] border border-muted bg-canvas px-3 text-base text-fg hover:border-fg"
        />
        <button type="submit" className={button.primary}>
          Open their recap
        </button>
      </div>
    </form>
  );
}
