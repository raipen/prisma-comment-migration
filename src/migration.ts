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

async function promptMigrationName(): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question("Enter migration name (leave empty for default): ", (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

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
