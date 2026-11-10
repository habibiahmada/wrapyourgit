/** What the "Keep your year" panel can make in the browser. The share card is a plain link. */
export type ExportJob = "mp4" | "zip" | "pdf";

export type ExportState =
  | { status: "idle" }
  | { status: "rendering"; job: ExportJob; progress: number }
  | { status: "done"; job: ExportJob; file: string }
  | { status: "error"; job: ExportJob }
  | { status: "cancelled"; job: ExportJob };

export type ExportAction =
  | { type: "start"; job: ExportJob }
  | { type: "progress"; value: number }
  | { type: "finish"; file: string }
  | { type: "fail" }
  | { type: "cancel" };

export const IDLE: ExportState = { status: "idle" };

const NOUN: Record<ExportJob, string> = { mp4: "video", zip: "slides", pdf: "PDF" };

export function exportReducer(state: ExportState, action: ExportAction): ExportState {
  if (action.type === "start") {
    // The web renderer is single-threaded and shares the tab: one render at a time.
    return state.status === "rendering"
      ? state
      : { status: "rendering", job: action.job, progress: 0 };
  }
  if (state.status !== "rendering") return state;
  switch (action.type) {
    case "progress": {
      const value = Number.isFinite(action.value) ? Math.min(1, Math.max(0, action.value)) : 0;
      // Late callbacks can report less than the last one; the bar never moves backwards.
      return value > state.progress ? { ...state, progress: value } : state;
    }
    case "finish":
      return { status: "done", job: state.job, file: action.file };
    case "fail":
      return { status: "error", job: state.job };
    case "cancel":
      return { status: "cancelled", job: state.job };
  }
}

/** Rounded down: 100% appears only once the last frame is in. */
export function percent(state: ExportState): number {
  return state.status === "rendering" ? Math.floor(state.progress * 100) : 0;
}

/** What the live region says. Steps of 10% while rendering keep screen readers from chattering. */
export function announcement(state: ExportState): string {
  switch (state.status) {
    case "idle":
      return "";
    case "rendering":
      return `Making your ${NOUN[state.job]}: ${Math.floor(percent(state) / 10) * 10}%`;
    case "done":
      return `Saved ${state.file}. Check your downloads.`;
    case "error":
      return `The ${NOUN[state.job]} couldn't be made in this browser. Try Chrome on a computer.`;
    case "cancelled":
      return "Cancelled. Nothing was saved.";
  }
}
