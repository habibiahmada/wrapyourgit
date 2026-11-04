/**
 * Starts (or reuses) the local Postgres 16 container for development.
 *
 *   bun scripts/dev-db.ts          # start
 *   bun scripts/dev-db.ts --stop   # stop (data is kept in the named volume)
 *
 * Works with podman or docker, whichever is installed. Matches DATABASE_URL in .env.example.
 */
import { $ } from "bun";

const NAME = "wyg-postgres";
const PORT = 54329;
const engine = Bun.which("podman") ? "podman" : Bun.which("docker") ? "docker" : null;
if (!engine) {
  console.error(
    "Neither podman nor docker is installed. Install one, or point DATABASE_URL at Neon.",
  );
  process.exit(1);
}

if (process.argv.includes("--stop")) {
  await $`${engine} stop ${NAME}`.quiet().nothrow();
  console.log(`Stopped ${NAME}.`);
  process.exit(0);
}

const exists = (await $`${engine} container exists ${NAME}`.quiet().nothrow()).exitCode === 0;
if (exists) {
  await $`${engine} start ${NAME}`.quiet();
} else {
  await $`${engine} run -d --name ${NAME} -p 127.0.0.1:${PORT}:5432 -e POSTGRES_USER=wyg -e POSTGRES_PASSWORD=wyg -e POSTGRES_DB=wrapyourgit -v wyg-postgres-data:/var/lib/postgresql/data docker.io/library/postgres:16-alpine`.quiet();
}

for (let attempt = 0; attempt < 30; attempt++) {
  const ready = await $`${engine} exec ${NAME} pg_isready -U wyg -d wrapyourgit`.quiet().nothrow();
  if (ready.exitCode === 0) {
    console.log(`Postgres ready: postgres://wyg:wyg@localhost:${PORT}/wrapyourgit`);
    process.exit(0);
  }
  await Bun.sleep(500);
}
console.error(`${NAME} did not become ready in 15 s. Check: ${engine} logs ${NAME}`);
process.exit(1);
