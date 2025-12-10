import fs from "fs";
import path from "path";
import readline from "readline";

function getDatePrefix(): string {
  const date = new Date();
  date.setMilliseconds(0);

  return date
    .toISOString()
    .replace(/[:\-TZ]/g, "")
    .replace(".000", "");
}

function createReadlineInterface(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

async function prompt(question: string): Promise<string> {
  const rl = createReadlineInterface();
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function promptMigrationName(): Promise<string> {
  return prompt("Enter migration name (leave empty for default): ");
}

async function confirmFile(filePath: string): Promise<boolean> {
  const answer = await prompt(`Append to "${filePath}"? (y/N): `);
  return answer.toLowerCase() === "y";
}

function findLatestMigrationDir(migrationsDir: string): string | null {
  if (!fs.existsSync(migrationsDir)) {
    return null;
  }

  const dirs = fs
    .readdirSync(migrationsDir, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name)
    .sort()
    .reverse();

  return dirs.length > 0 ? dirs[0] : null;
}

export const appendToLatestMigration = async (
  migrationsDir: string,
  commentStatements: string[]
): Promise<string | null> => {
  const latestDir = findLatestMigrationDir(migrationsDir);
  if (!latestDir) {
    console.error("No existing migration found to append to.");
    return null;
  }

  const migrationFilePath = path.join(migrationsDir, latestDir, "migration.sql");
  if (!fs.existsSync(migrationFilePath)) {
    console.error(`Migration file not found: ${migrationFilePath}`);
    return null;
  }

  const confirmed = await confirmFile(migrationFilePath);
  if (!confirmed) {
    console.log("Cancelled.");
    return null;
  }

  const existingContent = fs.readFileSync(migrationFilePath, "utf-8");
  const newContent = existingContent.trimEnd() + "\n\n" + commentStatements.join("\n");
  fs.writeFileSync(migrationFilePath, newContent, "utf-8");

  return latestDir;
};

export const outputMigrationFile = async (
  migrationsDir: string,
  commentStatements: string[],
  migrationName?: string
): Promise<string> => {
  const dateStr = getDatePrefix();

  let name = migrationName;
  if (!name) {
    name = await promptMigrationName();
  }

  const dirName = name
    ? `${dateStr}_${name.replace(/\s+/g, "_")}`
    : `${dateStr}_update_comments`;

  const migrationDir = path.join(migrationsDir, dirName);
  fs.mkdirSync(migrationDir, { recursive: true });
  fs.writeFileSync(
    path.join(migrationDir, "migration.sql"),
    commentStatements.join("\n"),
    "utf-8"
  );

  return dirName;
};
