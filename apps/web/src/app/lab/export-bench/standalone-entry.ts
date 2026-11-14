/*
 * Spike (#147): the page of the self-contained build (scripts/lab-export-bench.ts), the same bench
 * as the Next route without React. The build defines `__BENCH` with the worker's source, the font
 * and the logos as data: URLs.
 */
import { type BenchState, type Row, resultsText, runBench, runWhole } from "./bench";

type Inputs = { worker: string; font: string; logos: Record<string, string> };
const inputs = (globalThis as unknown as { __BENCH: Inputs }).__BENCH;
const prelude = `self.__BENCH_FONT=${JSON.stringify(inputs.font)};\n`;
const workerUrl = URL.createObjectURL(
  new Blob([prelude, inputs.worker], { type: "text/javascript" }),
);

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const runButton = $<HTMLButtonElement>("run");
const copyButton = $<HTMLButtonElement>("copy");
const wholeButton = $<HTMLButtonElement>("whole");
const statusText = $<HTMLElement>("status");
const body = $<HTMLTableSectionElement>("rows");

let rows: Row[] = [];
let state: BenchState | null = null;
let section = "";

function report(row: Row) {
  rows.push(row);
  if (row.section !== section) {
    section = row.section;
    const tr = body.insertRow();
    const th = document.createElement("th");
    th.colSpan = 2;
    th.textContent = row.section;
    tr.append(th);
  }
  const tr = body.insertRow();
  tr.insertCell().textContent = row.name;
  tr.insertCell().textContent = row.value;
  copyButton.disabled = false;
}
const status = (text: string) => {
  statusText.textContent = text;
};

function busy(on: boolean) {
  runButton.disabled = on;
  wholeButton.disabled = on || !state?.best || state.helpers.length === 0;
}

runButton.addEventListener("click", async () => {
  rows = [];
  section = "";
  body.replaceChildren();
  busy(true);
  try {
    state = await runBench(
      {
        makeWorker: () => new Worker(workerUrl),
        logoUrl: (href) => inputs.logos[href] ?? href,
      },
      report,
      status,
    );
    status("Done");
  } catch (error) {
    status(`Stopped: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    busy(false);
  }
});

wholeButton.addEventListener("click", async () => {
  if (!state) return;
  busy(true);
  try {
    await runWhole(state, report, status);
    status("Done");
  } finally {
    busy(false);
  }
});

copyButton.addEventListener("click", () => {
  const text = resultsText(rows);
  const area = $<HTMLTextAreaElement>("copy-text");
  area.value = text;
  area.hidden = false;
  navigator.clipboard.writeText(text).then(
    () => {
      copyButton.textContent = "Copied";
      setTimeout(() => {
        copyButton.textContent = "Copy results";
      }, 2000);
    },
    () => {
      area.select();
      status("Copy was blocked: the results are selected in the box below, copy them by hand.");
    },
  );
});
