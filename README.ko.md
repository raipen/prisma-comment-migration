# prisma-comment-migration

Prisma schema의 `///` 주석(triple-slash comments)을 데이터베이스 COMMENT로 반영하는 migration 파일을 생성하는 CLI 도구입니다.

## Why?

Prisma는 schema 파일에 작성한 `///` 주석을 Prisma Client의 JSDoc으로는 반영하지만, 실제 데이터베이스의 테이블/컬럼 COMMENT에는 반영하지 않습니다. 이 도구는 그 간극을 메워줍니다.

```prisma
/// 사용자 정보를 저장하는 테이블
model User {
  /// 사용자 고유 식별자
  id    Int    @id @default(autoincrement())
  /// 사용자 이메일 주소
  email String @unique
}
```

위와 같은 schema에서 아래와 같은 migration SQL을 생성합니다:

```sql
-- User comments
ALTER TABLE `User` COMMENT = '사용자 정보를 저장하는 테이블';
CALL prisma_update_column_comment('User', 'id', '사용자 고유 식별자');
CALL prisma_update_column_comment('User', 'email', '사용자 이메일 주소');
```

## Installation

```bash
npm install -D @raipen/prisma-comment-migration
```

## Usage

### Basic

```bash
npx prisma-comment-migration
# 또는
npx pcm
```

실행하면 migration 이름을 입력받고, `prisma/migrations/{timestamp}_{name}/migration.sql` 파일을 생성합니다.

### Options

```
Options:
  -s, --schema <path>         schema.prisma 경로 (default: prisma/schema.prisma)
  -l, --latest-comment <path> 주석 상태 저장 파일 경로 (default: prisma/.latest_migration_comment.json)
  -t, --targets <targets>     대상 지정: table,column (default: table,column)
  -e, --include-enum          필드 주석에 enum 값 포함 (default: true)
      --no-include-enum       필드 주석에 enum 값 미포함
  -p, --provider <provider>   데이터베이스: mysql, postgresql (default: mysql)
  -o, --output-dir <path>     migration 출력 디렉토리 (default: prisma/migrations)
  -n, --name <name>           migration 이름 (미지정시 프롬프트로 입력)
  -a, --append                새 파일 생성 대신 마지막 migration에 추가
  -h, --help                  도움말 표시
```

### Examples

```bash
# migration 이름 지정
npx pcm -n "add_user_comments"

# 테이블 주석만 생성
npx pcm -t table

# 마지막 migration 파일에 추가 (확인 프롬프트 표시)
npx pcm --append

# PostgreSQL 사용
npx pcm -p postgresql
```

## How It Works

1. `prisma/schema.prisma`를 파싱하여 모델과 필드의 `///` 주석을 추출
2. 이전 실행 시 저장된 주석 상태(`.latest_migration_comment.json`)와 비교
3. 변경된 주석만 포함하는 migration SQL 생성
4. 현재 주석 상태를 저장하여 다음 실행 시 비교에 사용

## Enum Support

Enum 타입 필드의 경우, 주석에 enum 값을 자동으로 포함할 수 있습니다:

```prisma
enum Role {
  ADMIN
  USER
  GUEST
}

model User {
  /// 사용자 역할
  role Role
}
```

생성되는 주석: `사용자 역할\nenum: Role(ADMIN, USER, GUEST)`

`--no-include-enum` 옵션으로 비활성화할 수 있습니다.

## Database Support

### MySQL (Stable)

- 테이블 주석: `ALTER TABLE ... COMMENT`
- 컬럼 주석: 컬럼 정의를 보존하면서 주석만 변경하는 stored procedure 사용

### PostgreSQL (Experimental)

> **Note**: PostgreSQL 지원은 실험적 기능입니다. 작성자가 PostgreSQL을 사용하지 않아 충분한 테스트가 이루어지지 않았습니다.
>
> PostgreSQL 사용자분들의 테스트 및 피드백, PR을 환영합니다!

- `COMMENT ON TABLE ...`
- `COMMENT ON COLUMN ...`
- Multi-schema 지원

## Workflow

`npx prisma migrate dev` 실행 후 이 도구를 실행하는 것을 권장합니다:

```bash
# 1. Prisma migration 생성
npx prisma migrate dev --name add_user_table

# 2. 주석 migration 생성 (같은 migration에 추가)
npx pcm --append

# 또는 별도 migration으로 생성
npx pcm -n "add_user_comments"
```

## Files

- `prisma/.latest_migration_comment.json`: 마지막으로 생성된 주석 상태를 저장합니다. **이 파일을 git에 커밋하세요.** 팀원 간 주석 변경 추적에 필요합니다.

## License

MIT

## Contributing

이슈와 PR을 환영합니다! 특히 다음 영역에서 기여를 기다립니다:

- PostgreSQL 테스트 및 버그 리포트
- 다른 데이터베이스 지원 (SQLite, SQL Server 등)
- 테스트 코드 작성
