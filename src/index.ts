import prismaInternals from "@prisma/internals";
import fs from "fs";
import path from "path";
import { parse } from "./parser";
import { Comments, Config, createComments, diffComments } from "./comment";
import { generateCommentStatements } from "./statement";

const { getDMMF } = prismaInternals;

async function main(
  schemaInputPath: string = "prisma/schema.prisma",
  migrationOutputPath: string = "prisma/migrations",
  latestCommentFilePath: string = "prisma/.latest_migration_comment.json",
  config: Config = {
    targets: ["table", "column"],
    includeEnumInFieldComment: true,
    provider: "mysql",
    outputDir: "prisma/migrations",
  }
) {
  // 호스트 프로젝트의 prisma/schema.prisma 찾기
  const schemaPath = path.join(process.cwd(), schemaInputPath);

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
    latestCommentFilePath
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

  const migrationDirName = await outputMigrationFile(
    config.outputDir,
    commentStatements
  );

  // update latest
  fs.writeFileSync(
    latestCommentFilePath,
    JSON.stringify(currentComments, null, 2),
    "utf-8"
  );

  console.log(`Comments generation completed: ${migrationDirName}`);
}

const outputMigrationFile = async (
  migrationsDir: string,
  commentStatements: string[]
) => {
  const date = new Date();
  date.setMilliseconds(0);

  const dateStr = date
    .toISOString()
    .replace(/[:\-TZ]/g, "")
    .replace(".000", "");
  const dirName = `${dateStr}_update_comments`;

  const migrationDir = path.join(migrationsDir, dirName);
  fs.mkdirSync(migrationDir, { recursive: true });
  fs.writeFileSync(
    path.join(migrationDir, "migration.sql"),
    commentStatements.join("\n"),
    "utf-8"
  );

  return dirName;
};

main();
