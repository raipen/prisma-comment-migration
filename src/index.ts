import prismaInternals from "@prisma/internals";
import fs from "fs";
import path from "path";
import { parse } from "./parser";
import { Comments, createComments, diffComments } from "./comment";
import { generateCommentStatements } from "./statement";
import { defaultConfig, FullConfig, parseArgs } from "./config";
import { appendToLatestMigration, outputMigrationFile } from "./migration";

const { getDMMF } = prismaInternals;

async function main(config: FullConfig) {
  const schemaPath = path.join(process.cwd(), config.schemaInputPath);

  if (!fs.existsSync(schemaPath)) {
    console.error(`Could not find schema.prisma at ${schemaPath}`);
    process.exit(1);
  }

  const schema = fs.readFileSync(schemaPath, "utf-8");
  const dmmf = await getDMMF({ datamodel: schema });
  const models = parse(dmmf.datamodel);
  const currentComments = createComments(models, config);

  const latestMigrationCommentFilePath = path.join(
    process.cwd(),
    config.latestCommentFilePath
  );
  let latestComments = {} as Comments;
  if (fs.existsSync(latestMigrationCommentFilePath)) {
    const commentFileContent = fs.readFileSync(
      latestMigrationCommentFilePath,
      "utf-8"
    );
    latestComments = JSON.parse(commentFileContent);
  }

  const diff = diffComments(currentComments, latestComments);
  const commentStatements = generateCommentStatements(diff, config.provider);

  if (commentStatements.length === 0) {
    console.log(
      "No changes detected, skipping creating a fresh comments migration..."
    );
    return;
  }

  let migrationDirName: string | null;

  if (config.appendToLatest) {
    migrationDirName = await appendToLatestMigration(
      config.outputDir,
      commentStatements
    );
    if (!migrationDirName) {
      return;
    }
  } else {
    migrationDirName = await outputMigrationFile(
      config.outputDir,
      commentStatements,
      config.migrationName
    );
  }

  fs.writeFileSync(
    latestMigrationCommentFilePath,
    JSON.stringify(currentComments, null, 2),
    "utf-8"
  );

  const action = config.appendToLatest ? "appended to" : "created";
  console.log(`Comments migration ${action}: ${migrationDirName}`);
}

const args = process.argv.slice(2);
const parsedConfig = parseArgs(args);
const config: FullConfig = { ...defaultConfig, ...parsedConfig };

main(config);
