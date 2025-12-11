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

function isOption(arg: string | undefined): boolean {
  return arg !== undefined && arg.startsWith("-");
}

function exitWithError(message: string): never {
  console.error(`Error: ${message}`);
  console.error("Use -h or --help for usage information.");
  process.exit(1);
}

function requireValue(arg: string, nextArg: string | undefined): string {
  if (!nextArg || isOption(nextArg)) {
    exitWithError(`${arg} requires a value`);
  }
  return nextArg;
}

export function parseArgs(args: string[]): Partial<FullConfig> {
  const config: Partial<FullConfig> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    switch (arg) {
      case "--schema":
      case "-s":
        config.schemaInputPath = requireValue(arg, nextArg);
        i++;
        break;
      case "--latest-comment":
      case "-l":
        config.latestCommentFilePath = requireValue(arg, nextArg);
        i++;
        break;
      case "--targets":
      case "-t": {
        const value = requireValue(arg, nextArg);
        const targets = value
          .split(",")
          .filter((t): t is Target => AllTargets.includes(t as Target));
        if (targets.length === 0) {
          exitWithError(`${arg} requires valid targets (table, column)`);
        }
        config.targets = targets;
        i++;
        break;
      }
      case "--include-enum":
      case "-e":
        config.includeEnumInFieldComment = true;
        break;
      case "--no-include-enum":
        config.includeEnumInFieldComment = false;
        break;
      case "--provider":
      case "-p": {
        const value = requireValue(arg, nextArg);
        if (!["mysql", "postgresql"].includes(value)) {
          exitWithError(`${arg} must be 'mysql' or 'postgresql'`);
        }
        config.provider = value as DatabaseProvider;
        i++;
        break;
      }
      case "--output-dir":
      case "-o":
        config.outputDir = requireValue(arg, nextArg);
        i++;
        break;
      case "--name":
      case "-n":
        config.migrationName = requireValue(arg, nextArg);
        i++;
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

  // Validate conflicting options
  if (config.appendToLatest && config.migrationName) {
    exitWithError("--append (-a) and --name (-n) cannot be used together");
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

Note: -n and -a cannot be used together.
`);
}
