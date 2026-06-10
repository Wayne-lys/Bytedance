import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const baseSchemaPath = join(rootDir, "prisma", "schema.prisma");
const generatedDir = join(rootDir, "prisma", ".generated");
const generatedSchemaPath = join(generatedDir, "schema.prisma");

function readDatabaseUrlFromEnvFile() {
  const envPath = join(rootDir, ".env");
  if (!existsSync(envPath)) {
    return "";
  }

  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^\s*DATABASE_URL\s*=\s*(.+?)\s*$/);
    if (!match) {
      continue;
    }

    return match[1].replace(/^['"]|['"]$/g, "");
  }

  return "";
}

function getDatabaseUrl() {
  return process.env.DATABASE_URL || readDatabaseUrlFromEnvFile();
}

function getSchemaForCurrentEnv() {
  const databaseUrl = getDatabaseUrl();
  if (!/^postgres(?:ql)?:\/\//i.test(databaseUrl)) {
    return baseSchemaPath;
  }

  const schema = readFileSync(baseSchemaPath, "utf8").replace(
    /provider\s*=\s*"sqlite"/,
    'provider = "postgresql"',
  );

  mkdirSync(generatedDir, { recursive: true });
  writeFileSync(generatedSchemaPath, schema);

  return generatedSchemaPath;
}

const prismaArgs = process.argv.slice(2);
const commandArgs = prismaArgs.length > 0 ? prismaArgs : ["generate"];
const schemaPath = getSchemaForCurrentEnv();
const prismaCommand = process.execPath;
const prismaEntry = join(rootDir, "node_modules", "prisma", "build", "index.js");
const result = spawnSync(
  prismaCommand,
  [prismaEntry, ...commandArgs, "--schema", schemaPath],
  {
    cwd: rootDir,
    env: process.env,
    stdio: "inherit",
  },
);

if (result.error) {
  console.error(result.error.message);
}

process.exit(result.status ?? 1);
