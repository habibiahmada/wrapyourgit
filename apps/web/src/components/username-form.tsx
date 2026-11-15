/**
 * The one field that opens anyone's recap. A plain GET form, so it works before (or without)
 * JavaScript: /go cleans up the name and redirects to /<username> (ruling R4).
 *
 * The field and its button share one bordered surface on every screen size (#167). The button is
 * a search icon whose accessible name is `submit` ("Play your year" on the landing). The border
 * is #7a7468 (4.07:1 on the canvas, 3.75:1 on the surface, over the 3:1 a control's edge needs),
 * lighter on hover, and green with a second pixel of green when the text box has focus (8:1). An
 * `@` before the box says a username goes here without a placeholder doing the label's job.
 * `error` is text, not just a red border, and the field points at it.
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
      <div
        className={`flex items-center gap-1 rounded-[calc(var(--radius-control)+4px)] border border-[#7a7468] bg-surface p-1 pl-3 hover:border-muted has-[input:focus-visible]:border-green has-[input:focus-visible]:shadow-[0_0_0_1px_var(--color-green)] has-[input[aria-invalid=true]]:border-[#ff7b72] ${EASE}`}
      >
        <span aria-hidden className="text-lg text-muted select-none">
          @
        </span>
        <input
          id={id}
          name="u"
          type="text"
          required
          maxLength={100}
          placeholder="your-username"
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          // The surface around the box carries the focus ring (green border plus a pixel of
          // green), so the box's own outline would only draw a second ring inside it.
          className="min-h-11 min-w-0 flex-1 bg-transparent text-base text-fg placeholder:text-muted focus-visible:outline-none"
        />
        <button
          type="submit"
          aria-label={submit}
          title={submit}
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-control)] border border-white/10 bg-green-button text-white hover:bg-[#1a6f35] active:bg-[#186a32] motion-safe:transition-colors"
        >
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            className="size-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.25"
            strokeLinecap="round"
          >
            <circle cx="10.5" cy="10.5" r="6.5" />
            <path d="m15.5 15.5 5 5" />
          </svg>
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

/** Borders and the focus ring ease in; with reduced motion they change at once. */
const EASE = "motion-safe:transition-[border-color,box-shadow] motion-safe:duration-150";
