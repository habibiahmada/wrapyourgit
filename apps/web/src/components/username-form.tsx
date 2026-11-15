import { button } from "@/components/ui";

/**
 * The one field that opens anyone's recap. A plain GET form, so it works before (or without)
 * JavaScript: /go cleans up the name and redirects to /<username> (ruling R4).
 *
 * From sm up the field and its button sit in one bordered surface, so they read as one control
 * (#167); on a phone they stack, each a full-width 48px target. The border is #7a7468 (4.07:1 on
 * the canvas, 3.75:1 on the surface, over the 3:1 a control's edge needs), lighter on hover, and
 * green with a second pixel of green when the text box has focus (8:1). An `@` before the box says
 * a username goes here without a placeholder doing the label's job. `error` is text, not just a
 * red border, and the field points at it.
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
        className={`flex flex-col gap-3 sm:flex-row sm:gap-1 sm:rounded-[calc(var(--radius-control)+4px)] sm:border sm:border-[#7a7468] sm:bg-surface sm:p-1 sm:hover:border-muted sm:has-[input:focus-visible]:border-green sm:has-[input:focus-visible]:shadow-[0_0_0_1px_var(--color-green)] sm:has-[input[aria-invalid=true]]:border-[#ff7b72] ${EASE}`}
      >
        <div
          className={`flex min-h-12 flex-1 items-center gap-1 px-3 sm:min-h-11 sm:px-2 max-sm:rounded-[var(--radius-control)] max-sm:border max-sm:border-[#7a7468] max-sm:bg-surface max-sm:hover:border-muted max-sm:has-[input:focus-visible]:border-green max-sm:has-[input:focus-visible]:shadow-[0_0_0_1px_var(--color-green)] max-sm:has-[input[aria-invalid=true]]:border-[#ff7b72] ${EASE}`}
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
        </div>
        <button type="submit" className={`${button.primary} max-sm:min-h-12`}>
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

/** Borders and the focus ring ease in; with reduced motion they change at once. */
const EASE = "motion-safe:transition-[border-color,box-shadow] motion-safe:duration-150";
