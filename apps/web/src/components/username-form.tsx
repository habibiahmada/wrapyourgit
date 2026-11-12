import { button } from "@/components/ui";

/**
 * The one field that opens anyone's recap. A plain GET form, so it works before (or without)
 * JavaScript: /go cleans up the name and redirects to /<username> (ruling R4). The border is
 * muted grey, 6.1:1 on the canvas, so the field reads as a field. `error` is text, not just a red
 * border, and the field points at it.
 */
export function UsernameForm({
  id,
  label = "GitHub username",
  submit = "Open the recap",
  error,
}: {
  id: string;
  label?: string;
  submit?: string;
  error?: string;
}) {
  const errorId = `${id}-error`;
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
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="min-h-11 min-w-0 flex-1 rounded-[var(--radius-control)] border border-muted bg-canvas px-3 text-base text-fg hover:border-fg aria-invalid:border-[#ff7b72]"
        />
        <button type="submit" className={button.primary}>
          {submit}
        </button>
      </div>
      {error && (
        <p id={errorId} role="alert" className="font-semibold text-[#ff7b72]">
          {error}
        </p>
      )}
    </form>
  );
}
