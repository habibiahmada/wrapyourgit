/*
 * GitHub (linguist) language names to the Devicon logo files in public/lang. Anything missing
 * returns null and the UI draws a badge in the language's own colour with its initials.
 */

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
  // Laravel's template language: it has no logo of its own, and editors show Laravel's.
  Blade: "laravel",
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

/**
 * Logos drawn in the very colour GitHub gives their language (Blade's red is Laravel's): printed
 * straight on the language's block they vanish, so they stand on the dark badge instead.
 */
const SAME_COLOUR = new Set(["Blade"]);

/** True when the language's logo needs a backing to show on its own block. */
export function logoNeedsBacking(name: string): boolean {
  return SAME_COLOUR.has(name) && languageIcon(name) !== null;
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

/**
 * Third green of GitHub's ramp (theme.palette.heat[2]). Inlined because theme.ts pulls Remotion in,
 * and this module is imported from Server Components; web-modules.test.ts guards that.
 */
const FALLBACK_LANGUAGE_COLOR = "#30A14E";

/** Fill for a language's own colour, or the third green of GitHub's ramp when it has none. */
export function languageColor(color: string | null): string {
  return color ?? FALLBACK_LANGUAGE_COLOR;
}
