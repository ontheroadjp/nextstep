import { describe, expect, it } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";

const ROOT = process.cwd();

function runScript(script: string, args: string[] = [], env: Partial<NodeJS.ProcessEnv> = {}) {
  return spawnSync("bash", [join(ROOT, script), ...args], {
    cwd: ROOT,
    env: { ...process.env, ...env },
    encoding: "utf8",
  });
}

describe("DB migration scripts", () => {
  it("db_migrate.sh shows plan in dry-run mode", () => {
    const result = runScript("scripts/db_migrate.sh", ["--dry-run"]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("DRY-RUN: migrate plan");
    expect(result.stdout).toContain("db/migrations/0001_init.sql");
    expect(result.stdout).toContain("db/maintenance/0002_apply_sort_key_constraints.sql");
    expect(result.stdout).toContain("db/maintenance/0003_archive_flow.sql");
  });

  it("db_migrate.sh fails without DATABASE_URL when not dry-run", () => {
    const result = runScript("scripts/db_migrate.sh", [], { DATABASE_URL: "" });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("DATABASE_URL is required");
  });

  it("db_backup.sh requires output argument", () => {
    const result = runScript("scripts/db_backup.sh", ["--dry-run"]);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("--output is required.");
  });

  it("db_backup.sh shows target in dry-run mode", () => {
    const result = runScript("scripts/db_backup.sh", ["--dry-run", "--output", "tmp/backup.sql"]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("DRY-RUN: backup plan");
    expect(result.stdout).toContain("tmp/backup.sql");
  });

  it("db_rollback.sh requires input argument", () => {
    const result = runScript("scripts/db_rollback.sh", ["--dry-run"]);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("--input is required.");
  });

  it("db_rollback.sh validates input file existence", () => {
    const result = runScript("scripts/db_rollback.sh", ["--dry-run", "--input", "tmp/missing.sql"]);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("Input SQL file not found");
  });

  it("db_rollback.sh shows restore target in dry-run mode", () => {
    const dir = mkdtempSync(join(tmpdir(), "db-rollback-test-"));
    const file = join(dir, "backup.sql");
    writeFileSync(file, "-- backup\n", "utf8");

    try {
      const result = runScript("scripts/db_rollback.sh", ["--dry-run", "--input", file]);
      expect(result.status).toBe(0);
      expect(result.stdout).toContain("DRY-RUN: rollback plan");
      expect(result.stdout).toContain(file);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
