/**
 * Six contribution cells, two rows of three: the product is the graph. The same colours and
 * layout as app/icon.svg (the favicon), so the tab and the header carry one mark.
 */
export const LOGO_CELLS = ["#0e4429", "#26a641", "#39d353", "#006d32", "#39d353", "#26a641"];

export function LogoMark() {
  return (
    <span aria-hidden className="grid grid-cols-3 gap-[2px]">
      {LOGO_CELLS.map((color, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: fixed six-cell mark
        <span key={i} className="size-[6px] rounded-[1.5px]" style={{ background: color }} />
      ))}
    </span>
  );
}
