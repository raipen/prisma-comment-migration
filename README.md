# prisma-comment-migration

[한국어](./README.ko.md)

A CLI tool that generates migration files to sync Prisma schema `///` comments (triple-slash comments) to database TABLE/COLUMN COMMENTs.

## Why?

Prisma reflects `///` comments in schema files as JSDoc in Prisma Client, but does not sync them to actual database TABLE/COLUMN COMMENTs. This tool bridges that gap.

```prisma
/// User information table
model User {
  /// Unique user identifier
  id    Int    @id @default(autoincrement())
  /// User email address
  email String @unique
}
```

From the schema above, this tool generates the following migration SQL:

```sql
-- User comments
ALTER TABLE `User` COMMENT = 'User information table';
CALL prisma_update_column_comment('User', 'id', 'Unique user identifier');
CALL prisma_update_column_comment('User', 'email', 'User email address');
```

## Installation

```bash
npm install -D @raipen/prisma-comment-migration @prisma/internals
```

> **Note**: `@prisma/internals` version should match your `prisma` version. If you're using prisma 5.x, install `@prisma/internals@5`.

## Usage

### Basic

```bash
npx prisma-comment-migration
# or
npx pcm
```

You'll be prompted for a migration name, then a migration file will be created at `prisma/migrations/{timestamp}_{name}/migration.sql`.

### Options

```
Options:
  -s, --schema <path>         Path to schema.prisma (default: prisma/schema.prisma)
  -l, --latest-comment <path> Path to comment state file (default: prisma/.latest_migration_comment.json)
  -t, --targets <targets>     Comma-separated targets: table,column (default: table,column)
  -e, --include-enum          Include enum values in field comments (default: true)
      --no-include-enum       Do not include enum values in field comments
  -p, --provider <provider>   Database provider: mysql, postgresql (default: mysql)
  -o, --output-dir <path>     Output directory for migrations (default: prisma/migrations)
  -n, --name <name>           Migration name (will prompt if not provided)
  -a, --append                Append to the latest migration file instead of creating new one
  -h, --help                  Show help message

Note: -n and -a cannot be used together.
```

### Examples

```bash
# Specify migration name
npx pcm -n "add_user_comments"

# Generate table comments only
npx pcm -t table

# Append to the latest migration file (with confirmation prompt)
npx pcm --append

# Use PostgreSQL
npx pcm -p postgresql
```

## How It Works

1. Parses `prisma/schema.prisma` to extract `///` comments from models and fields
2. Compares with previously saved comment state (`.latest_migration_comment.json`)
3. Generates migration SQL containing only changed comments
4. Saves current comment state for next comparison

## Enum Support

For enum type fields, enum values can be automatically included in comments:

```prisma
enum Role {
  ADMIN
  USER
  GUEST
}

model User {
  /// User role
  role Role
}
```

Generated comment: `User role\nenum: Role(ADMIN, USER, GUEST)`

Use `--no-include-enum` to disable this feature.

## Prisma Version Support

Supports Prisma 4.x ~ 7.x.

| Prisma Version | Status |
|----------------|--------|
| 4.x | Supported |
| 5.x | Supported |
| 6.x | Supported |
| 7.x | Supported |

> **Note**: Starting from Prisma 7, the `url` property in `datasource` has been removed from schema files and moved to `prisma.config.ts`. This is a Prisma-specific change, and this library works correctly with the new schema format.

## Database Support

### MySQL (Stable)

- Table comments: `ALTER TABLE ... COMMENT`
- Column comments: Uses stored procedure that preserves column definition while modifying only the comment

### PostgreSQL (Experimental)

> **Note**: PostgreSQL support is experimental. The author does not use PostgreSQL, so it has not been thoroughly tested.
>
> Testing, feedback, and PRs from PostgreSQL users are welcome!

- `COMMENT ON TABLE ...`
- `COMMENT ON COLUMN ...`
- Multi-schema support

## Workflow

We recommend using `--create-only` to create the migration file first, then append comments before applying:

```bash
# 1. Create Prisma migration file (without applying)
npx prisma migrate dev --name add_user_table --create-only

# 2. Append comment statements to the migration
npx pcm --append

# 3. Apply the migration
npx prisma migrate dev
```

Or create comments as a separate migration:

```bash
# 1. Apply schema changes first
npx prisma migrate dev --name add_user_table

# 2. Create comment migration
npx pcm -n "add_user_comments"

# 3. Apply comment migration
npx prisma migrate dev
```

## Files

- `prisma/.latest_migration_comment.json`: Stores the last generated comment state. **Commit this file to git.** It's needed for tracking comment changes across team members.

## License

MIT

## Contributing

Issues and PRs are welcome! We especially look forward to contributions in these areas:

- PostgreSQL testing and bug reports
- Support for other databases (SQLite, SQL Server, etc.)
- Test code
