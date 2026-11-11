import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
const files = readdirSync(new URL("../tests/", import.meta.url)).filter(file => file.endsWith(".test.mjs")).sort().map(file => "tests/" + file);
const result = spawnSync(process.execPath, ["--test", "--test-concurrency=1", ...files], { stdio: "inherit", cwd: new URL("../", import.meta.url) });
if (result.error) console.error(result.error.message);
process.exitCode = result.status ?? 1;
