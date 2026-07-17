# SQLite DDL Reference

> For building `@aromix/schema` → `lite` dialect

---

## Table Declaration

```sql
CREATE TABLE [IF NOT EXISTS] table_name (
  column_definitions,
  table_constraints
) [WITHOUT ROWID] [STRICT];
```

| Keyword         | Notes                                                     |
| --------------- | --------------------------------------------------------- |
| `IF NOT EXISTS` | Skip silently if table already exists                     |
| `WITHOUT ROWID` | No implicit rowid column; requires explicit PK            |
| `STRICT`        | Enforces actual type checking (SQLite 3.37+, D1 supports) |

---

## Column Types (Affinity System)

SQLite doesn't enforce types — it uses **type affinity**. The declared name maps to one of 5 affinities.

| Type      | Affinity | Use for                                               |
| --------- | -------- | ----------------------------------------------------- |
| `INTEGER` | INTEGER  | Integers, booleans (0/1), foreign keys                |
| `REAL`    | REAL     | Floating point numbers                                |
| `TEXT`    | TEXT     | Strings, dates (ISO8601), UUIDs                       |
| `BLOB`    | BLOB     | Binary data, raw bytes                                |
| `NUMERIC` | NUMERIC  | Decimals, can store as int or real depending on value |

**STRICT mode types only** (stricter enforcement when `STRICT` table option is used):

| Type      | Notes                                       |
| --------- | ------------------------------------------- |
| `INT`     | Alias for INTEGER in STRICT                 |
| `INTEGER` |                                             |
| `REAL`    |                                             |
| `TEXT`    |                                             |
| `BLOB`    |                                             |
| `ANY`     | Accepts any type, no coercion (STRICT-only) |

**Conventions (no native type, use these by convention):**

| Convention | Stored as           | Notes                                       |
| ---------- | ------------------- | ------------------------------------------- |
| `BOOLEAN`  | `INTEGER`           | `0` = false, `1` = true                     |
| `DATE`     | `TEXT`              | ISO8601 format `YYYY-MM-DD`                 |
| `DATETIME` | `TEXT` or `INTEGER` | ISO8601 or Unix epoch                       |
| `JSON`     | `TEXT`              | SQLite has JSON functions that work on TEXT |

---

## Column Constraints

Order matters: `type → constraints` left to right.

### PRIMARY KEY

```sql
id INTEGER PRIMARY KEY
id INTEGER PRIMARY KEY AUTOINCREMENT
id TEXT PRIMARY KEY
```

- A table can have **only one** PRIMARY KEY
- `INTEGER PRIMARY KEY` is special — it becomes an alias for the rowid (64-bit signed int)
- `AUTOINCREMENT` prevents rowid reuse; only valid on `INTEGER PRIMARY KEY`; slightly slower
- Without `AUTOINCREMENT`, SQLite picks `max(rowid) + 1`; with it, it never reuses a deleted rowid

### NOT NULL

```sql
name TEXT NOT NULL
```

- Rejects `NULL` inserts/updates
- Can have a conflict clause: `NOT NULL ON CONFLICT ABORT`

### UNIQUE

```sql
email TEXT UNIQUE
email TEXT UNIQUE ON CONFLICT REPLACE
```

- Multiple `NULL` values are allowed (NULLs are never equal in SQLite)

### DEFAULT

```sql
status TEXT DEFAULT 'active'
count INTEGER DEFAULT 0
created_at TEXT DEFAULT (datetime('now'))  -- expression must be in parens
score REAL DEFAULT 0.0
flag INTEGER DEFAULT 1
```

- Literal values: numbers, strings, `NULL`, `TRUE`, `FALSE`
- Expressions: must be wrapped in `(parens)` — e.g. `DEFAULT (datetime('now'))`
- Common expression defaults:
    - `DEFAULT (datetime('now'))` → current UTC datetime
    - `DEFAULT (date('now'))` → current UTC date
    - `DEFAULT (unixepoch())` → current Unix timestamp
    - `DEFAULT (lower(hex(randomblob(16))))` → random UUID-ish

### CHECK

```sql
age INTEGER CHECK (age >= 0)
status TEXT CHECK (status IN ('active', 'inactive', 'banned'))
price REAL CHECK (price > 0)
```

- Arbitrary SQL expression; must evaluate to true for row to be accepted
- Can reference other columns in the same row

### REFERENCES (Inline FK)

```sql
user_id INTEGER REFERENCES users(id)
user_id INTEGER REFERENCES users(id) ON DELETE CASCADE ON UPDATE NO ACTION
```

- Inline shorthand for single-column foreign keys
- **Foreign keys are disabled by default** — requires `PRAGMA foreign_keys = ON`

### COLLATE

```sql
name TEXT COLLATE NOCASE
slug TEXT COLLATE BINARY
```

| Collation | Behavior                            |
| --------- | ----------------------------------- |
| `BINARY`  | Byte-by-byte comparison (default)   |
| `NOCASE`  | Case-insensitive for ASCII A-Z only |
| `RTRIM`   | Ignores trailing whitespace         |

### ON CONFLICT (Column-level)

Applies to `NOT NULL`, `UNIQUE`, `PRIMARY KEY`, `CHECK` constraints (not FK).

```sql
name TEXT NOT NULL ON CONFLICT ABORT
code TEXT UNIQUE ON CONFLICT REPLACE
```

| Option     | Behavior                                                 |
| ---------- | -------------------------------------------------------- |
| `ABORT`    | Rollback current statement, keep prior changes (default) |
| `FAIL`     | Stop at failing row, keep prior inserted rows            |
| `IGNORE`   | Skip the violating row silently                          |
| `REPLACE`  | Delete conflicting row, insert new one                   |
| `ROLLBACK` | Rollback entire transaction                              |

### GENERATED (Computed Columns)

```sql
full_name TEXT GENERATED ALWAYS AS (first_name || ' ' || last_name)
full_name TEXT GENERATED ALWAYS AS (first_name || ' ' || last_name) VIRTUAL
full_name TEXT GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED
```

- `VIRTUAL` (default): computed on read, not stored on disk
- `STORED`: computed on write, stored on disk (takes space, faster reads)
- Cannot have `DEFAULT`, `NOT NULL` on conflict `REPLACE`, or be a PK
- Expression can reference other columns in same table (not other tables)
- Available since SQLite 3.31.0

---

## Table Constraints

Defined after all column definitions.

### Composite PRIMARY KEY

```sql
PRIMARY KEY (col1, col2)
```

### Composite UNIQUE

```sql
UNIQUE (col1, col2)
UNIQUE (col1, col2) ON CONFLICT IGNORE
```

### FOREIGN KEY

```sql
FOREIGN KEY (col) REFERENCES other_table(col)
FOREIGN KEY (col1, col2) REFERENCES other_table(col1, col2) ON DELETE CASCADE
```

**ON DELETE / ON UPDATE actions:**

| Action        | Behavior                                             |
| ------------- | ---------------------------------------------------- |
| `NO ACTION`   | Do nothing (default; error if FK violated at commit) |
| `RESTRICT`    | Error immediately on violation                       |
| `CASCADE`     | Propagate delete/update to child rows                |
| `SET NULL`    | Set FK column to NULL on parent delete/update        |
| `SET DEFAULT` | Set FK column to its DEFAULT on parent delete/update |

### CHECK (Table-level)

```sql
CHECK (start_date < end_date)
CHECK (price > 0 AND stock >= 0)
```

- Same as column CHECK but can reference multiple columns

### Named Constraints

```sql
CONSTRAINT pk_name PRIMARY KEY (id)
CONSTRAINT uq_email UNIQUE (email)
CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id)
CONSTRAINT chk_age CHECK (age >= 0)
```

- Optional but useful for error messages and migrations
- Name goes before the constraint keyword

---

## Full Example

```sql
CREATE TABLE IF NOT EXISTS posts (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slug        TEXT NOT NULL UNIQUE COLLATE NOCASE,
  title       TEXT NOT NULL,
  body        TEXT,
  status      TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  score       REAL DEFAULT 0.0 CHECK (score >= 0),
  metadata    TEXT DEFAULT '{}',
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  word_count  INTEGER GENERATED ALWAYS AS (length(body) - length(replace(body, ' ', '')) + 1) VIRTUAL,

  CONSTRAINT uq_user_slug UNIQUE (user_id, slug)
);
```

---

## What SQLite Does NOT Support (skip these)

- `ALTER TABLE` — column add only; no modify/drop natively
- `ENUM` type — use `CHECK (col IN (...))` instead
- `ARRAY` type
- `JSON` type (use `TEXT` + JSON functions)
- `SERIAL` / `SEQUENCE` — use `INTEGER PRIMARY KEY AUTOINCREMENT`
- `VARCHAR(n)` / `CHAR(n)` — size is accepted but ignored
- `BOOLEAN` native type — use `INTEGER`
- `UUID` native type — use `TEXT`
- `TIMEZONE` support — store UTC, handle in app
- Named FK constraints from inline syntax (use table-level `CONSTRAINT` for that)
