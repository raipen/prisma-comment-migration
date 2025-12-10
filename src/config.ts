import { AllTargets, Config, Target } from "./comment";
import { DatabaseProvider } from "./statement";

export interface FullConfig extends Config {
  schemaInputPath: string;
  latestCommentFilePath: string;
  migrationName?: string;
  appendToLatest: boolean;
}

export const defaultConfig: FullConfig = {
  schemaInputPath: "prisma/schema.prisma",
  latestCommentFilePath: "prisma/.latest_migration_comment.json",
  targets: ["table", "column"],
  includeEnumInFieldComment: true,
  provider: "mysql",
  outputDir: "prisma/migrations",
  appendToLatest: false,
};

export function parseArgs(args: string[]): Partial<FullConfig> {
  const config: Partial<FullConfig> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    switch (arg) {
      case "--schema":
      case "-s":
        if (nextArg) {
          config.schemaInputPath = nextArg;
          i++;
        }
        break;
      case "--latest-comment":
      case "-l":
        if (nextArg) {
          config.latestCommentFilePath = nextArg;
          i++;
        }
        break;
      case "--targets":
      case "-t":
        if (nextArg) {
          const targets = nextArg
            .split(",")
            .filter((t): t is Target => AllTargets.includes(t as Target));
          if (targets.length > 0) {
            config.targets = targets;
          }
          i++;
        }
        break;
      case "--include-enum":
      case "-e":
        config.includeEnumInFieldComment = true;
        break;
      case "--no-include-enum":
        config.includeEnumInFieldComment = false;
        break;
      case "--provider":
      case "-p":
        if (nextArg && ["mysql", "postgresql"].includes(nextArg)) {
          config.provider = nextArg as DatabaseProvider;
          i++;
        }
        break;
      case "--output-dir":
      case "-o":
        if (nextArg) {
          config.outputDir = nextArg;
          i++;
        }
        break;
      case "--name":
      case "-n":
        if (nextArg) {
          config.migrationName = nextArg;
          i++;
        }
        break;
      case "--append":
      case "-a":
        config.appendToLatest = true;
        break;
      case "--help":
      case "-h":
        printHelp();
        process.exit(0);
    }
  }

  return config;
}

function printHelp(): void {
  console.log(`
prisma-comment-migration - Generate COMMENT migrations from Prisma schema

Usage: prisma-comment-migration [options]

Options:
  -s, --schema <path>         Path to schema.prisma (default: prisma/schema.prisma)
  -l, --latest-comment <path> Path to latest comment file (default: prisma/.latest_migration_comment.json)
  -t, --targets <targets>     Comma-separated targets: table,column (default: table,column)
  -e, --include-enum          Include enum values in field comments (default: true)
      --no-include-enum       Do not include enum values in field comments
  -p, --provider <provider>   Database provider: mysql, postgresql (default: mysql)
  -o, --output-dir <path>     Output directory for migrations (default: prisma/migrations)
  -n, --name <name>           Migration name (will prompt if not provided)
  -a, --append                Append to the latest migration file instead of creating new one
  -h, --help                  Show this help message
`);
}
