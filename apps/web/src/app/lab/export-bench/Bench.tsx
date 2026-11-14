"use client";

import { useRef, useState } from "react";
import { type BenchState, type Row, resultsText, runBench, runWhole } from "./bench";

const makeWorker = () =>
  new Worker(new URL("./bench.worker.ts", import.meta.url), { type: "module" });

export function Bench() {
  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState("Idle");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const state = useRef<BenchState | null>(null);
  const all = useRef<Row[]>([]);

  const report = (row: Row) => {
    all.current = [...all.current, row];
    setRows(all.current);
  };

  async function run() {
    setBusy(true);
    all.current = [];
    setRows([]);
    try {
      state.current = await runBench({ makeWorker }, report, setStatus);
      setStatus("Done");
    } catch (error) {
      setStatus(`Stopped: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setBusy(false);
    }
  }

  async function whole() {
    if (!state.current) return;
    setBusy(true);
    try {
      await runWhole(state.current, report, setStatus);
      setStatus("Done");
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    const text = resultsText(all.current);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = document.createElement("textarea");
      area.value = text;
      document.body.append(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  let section = "";
  return (
    <main
      style={{ padding: 16, fontFamily: "system-ui, sans-serif", fontSize: 14, lineHeight: 1.4 }}
    >
      <h1 style={{ fontSize: 20, margin: "0 0 8px" }}>Export bench (spike #147)</h1>
      <p style={{ margin: "0 0 12px" }}>
        Keep this tab in the foreground and the screen on until it says Done (about 1 to 3 minutes).
        Then tap Copy results and paste them back.
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <button type="button" onClick={run} disabled={busy} style={button}>
          Run
        </button>
        <button type="button" onClick={copy} disabled={rows.length === 0} style={button}>
          {copied ? "Copied" : "Copy results"}
        </button>
        <button
          type="button"
          onClick={whole}
          disabled={busy || !state.current?.best}
          style={button}
        >
          Optional: whole video
        </button>
      </div>
      <p style={{ margin: "0 0 12px" }} aria-live="polite">
        <strong>Status:</strong> {status}
      </p>
      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <tbody>
          {rows.map((row) => {
            const head = row.section !== section;
            section = row.section;
            return [
              head && (
                <tr key={`h-${row.section}`}>
                  <th colSpan={2} style={{ textAlign: "left", padding: "12px 0 4px" }}>
                    {row.section}
                  </th>
                </tr>
              ),
              <tr key={`${row.section}-${row.name}`} style={{ borderTop: "1px solid #8884" }}>
                <td style={{ padding: "4px 8px 4px 0", verticalAlign: "top", width: "38%" }}>
                  {row.name}
                </td>
                <td style={{ padding: 4, wordBreak: "break-word" }}>{row.value}</td>
              </tr>,
            ];
          })}
        </tbody>
      </table>
    </main>
  );
}

const button = { padding: "12px 16px", fontSize: 16, minHeight: 44 } as const;
