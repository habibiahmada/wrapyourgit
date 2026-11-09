/*
 * GitHub (linguist) language names to the Devicon logo files in public/lang. Anything missing
 * returns null and the UI draws a badge in the language's own colour with its initials.
 */

import { palette } from "./theme";

const ICONS: Record<string, string> = {
  TypeScript: "typescript",
  JavaScript: "javascript",
  Python: "python",
  Go: "go",
  Rust: "rust",
  Java: "java",
  Kotlin: "kotlin",
  Swift: "swift",
  C: "c",
  "C++": "cplusplus",
  "C#": "csharp",
  PHP: "php",
  Ruby: "ruby",
  Dart: "dart",
  HTML: "html5",
  CSS: "css3",
  SCSS: "sass",
  Sass: "sass",
  Shell: "bash",
  Vue: "vuejs",
  Svelte: "svelte",
  Lua: "lua",
  Elixir: "elixir",
  Haskell: "haskell",
  Scala: "scala",
  R: "r",
  Julia: "julia",
  Clojure: "clojure",
  Erlang: "erlang",
  Perl: "perl",
  "Objective-C": "objectivec",
  Dockerfile: "docker",
  Nix: "nixos",
  Zig: "zig",
  OCaml: "ocaml",
  "F#": "fsharp",
  Groovy: "groovy",
  PowerShell: "powershell",
  "Jupyter Notebook": "jupyter",
  Astro: "astro",
  Markdown: "markdown",
  MDX: "markdown",
  Solidity: "solidity",
  HCL: "terraform",
  TeX: "latex",
  "Vim Script": "vim",
  Elm: "elm",
  Nim: "nim",
  Crystal: "crystal",
};

/** Public path of the language's logo (`lang/<slug>.svg`), or null when there is none. */
export function languageIcon(name: string): string | null {
  const slug = ICONS[name];
  return slug ? `lang/${slug}.svg` : null;
}

/** One or two letters for the fallback badge: "Go" -> "Go", "Jupyter Notebook" -> "JN". */
export function languageInitials(name: string): string {
  const words = name.split(/[\s-]+/).filter(Boolean);
  if (words.length > 1)
    return words
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("");
  return name.slice(0, 2);
}

/** Fill for a language's own colour, or the third green of GitHub's ramp when it has none. */
export function languageColor(color: string | null): string {
  return color ?? palette.heat[2];
}
