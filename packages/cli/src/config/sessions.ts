import fs from "node:fs";
import path from "node:path";
import { TestSession } from "../domain/session.js";

/** Persists the last send session so `report` can publish it later. */
export class SessionStore {
  private readonly file?: string;
  private session?: TestSession;

  constructor(rootDir?: string) {
    if (rootDir) {
      this.file = path.join(rootDir, ".sonic-point", "session-cache.json");
      this.session = this.read();
    }
  }

  save(session: TestSession): void {
    this.session = session;

    if (this.file) {
      fs.mkdirSync(path.dirname(this.file), { recursive: true });
      fs.writeFileSync(this.file, JSON.stringify({ session }, null, 2), "utf-8");
    }
  }

  load(): TestSession | undefined {
    return this.session;
  }

  private read(): TestSession | undefined {
    if (!this.file) return undefined;

    try {
      const parsed = JSON.parse(fs.readFileSync(this.file, "utf-8")) as {
        session?: TestSession;
      };
      return parsed.session;
    } catch {
      return undefined;
    }
  }
}
