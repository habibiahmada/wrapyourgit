"use client";

import { useFormStatus } from "react-dom";
import { Art } from "@/components/art";
import { setPrivateNamesAction } from "./actions";
import { PAPER_BUTTON } from "./paper-button";

/*
 * Asked once, before the story's first stop. Ink on paper like the story it opens, with no site
 * header: the answer decides what the story shows, so nothing else competes with it. Each choice
 * says what it does under its button, so neither reads as the "right" one.
 */
export function PrivateNamesQuestion() {
  return (
    <main
      id="main"
      className="on-light flex flex-1 flex-col items-center justify-center bg-paper px-4 py-12 text-ink"
    >
      <div className="flex w-full max-w-2xl flex-col gap-8">
        <Art id="cutout-cell-think" alt="" priority className="h-auto w-40 self-start sm:w-48" />
        <div className="flex flex-col gap-3">
          <h1
            id="private-names-question"
            className="font-brand text-4xl leading-tight font-bold tracking-tight text-balance sm:text-5xl"
          >
            Show your private repository names?
          </h1>
          <p className="text-lg text-ink-soft">
            Your story plays right after. You can change this later in Settings.
          </p>
        </div>
        <form action={setPrivateNamesAction} aria-labelledby="private-names-question">
          <Choices />
        </form>
      </div>
    </main>
  );
}

function Choices() {
  const { pending } = useFormStatus();
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <button
            type="submit"
            name="show"
            value="yes"
            disabled={pending}
            aria-describedby="show-them-means"
            className={PAPER_BUTTON.secondary}
          >
            Show them
          </button>
          <p id="show-them-means" className="text-base text-ink-soft">
            Private names appear in your story and in the files you download.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <button
            type="submit"
            name="show"
            value="no"
            disabled={pending}
            aria-describedby="hide-them-means"
            className={PAPER_BUTTON.secondary}
          >
            Hide them
          </button>
          <p id="hide-them-means" className="text-base text-ink-soft">
            Your story and files use the public view, with private repositories unnamed.
          </p>
        </div>
      </div>
      <p aria-live="polite" className="min-h-7 text-base font-semibold">
        {pending ? "Saving your answer…" : ""}
      </p>
    </div>
  );
}
