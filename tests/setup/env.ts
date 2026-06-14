// Load .env into process.env for tests (no dotenv dependency). Only fills keys
// that are not already set, so an explicitly-exported shell env still wins.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

for (const file of [".env.local", ".env"]) {
  try {
    const text = readFileSync(resolve(process.cwd(), file), "utf8");
    for (const line of text.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      const key = m[1];
      let val = m[2].trim();
      const quote = val[0];
      if (quote === '"' || quote === "'") {
        // Quoted value: take exactly what's between the opening quote and its
        // matching close, ignoring any trailing inline `# comment`. The .env
        // files use the `KEY="48" # note` form, which otherwise parses as NaN.
        const close = val.indexOf(quote, 1);
        val = close === -1 ? val.slice(1) : val.slice(1, close);
      } else {
        // Unquoted value: strip an inline comment.
        const hash = val.indexOf(" #");
        if (hash !== -1) val = val.slice(0, hash).trim();
      }
      if (process.env[key] === undefined) process.env[key] = val;
    }
  } catch {
    // file absent — fine
  }
}
