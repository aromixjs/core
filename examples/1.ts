import {
  action,
  provide,
  inject,
  injectNew,
  result,
  type Result,
  group,
} from "../core";

// Services

@provide()
class Logger {
  info(msg: string) {
    console.log("[info]", msg);
  }
  error(msg: string) {
    console.log("[error]", msg);
  }
}

@provide()
class Database {
  private logger = inject(Logger);
  private data = new Map<string, string>();

  async get(id: string): Promise<Result<string, "not_found">> {
    const value = this.data.get(id);
    return value ? result.ok(value) : result.fail("not_found");
  }

  async set(id: string, value: string): Promise<Result<string, "duplicate">> {
    if (this.data.has(id)) return result.fail("duplicate");
    this.data.set(id, value);
    this.logger.info(`set ${id} = ${value}`);
    return result.ok(value);
  }
}

@provide()
class CsvParser {
  parse(input: string): string[][] {
    return input.split("\n").map((line) => line.split(","));
  }
}

@provide()
class ReportService {
  private db = inject(Database);
  private logger = inject(Logger);

  async generate(userId: string): Promise<Result<string, "not_found">> {
    const r = await this.db.get(userId);
    if (!r.ok) return result.fail("not_found");
    return result.ok(`Report: ${r.data}`);
  }

  async parseCsv(csv: string): Promise<Result<string[][], "parse_error">> {
    try {
      return result.ok(injectNew(CsvParser).parse(csv));
    } catch {
      return result.fail("parse_error");
    }
  }
}

// Handlers

@group("user")
class UserHandler {
  private db = inject(Database);

  @action("get")
  async get(ctx: { body: { id: string } }) {
    const r = await this.db.get(ctx.body.id);
    return r.ok ? { status: 200, data: r.data } : { status: 404, data: r.err };
  }

  @action("create")
  async create(ctx: { body: { id: string; value: string } }) {
    const r = await this.db.set(ctx.body.id, ctx.body.value);
    return r.ok ? { status: 201, data: r.data } : { status: 409, data: r.err };
  }
}

@group("data")
export class DataHandler {
  private reports = inject(ReportService);

  @action("parse")
  async parse(ctx: { body: { csv: string } }) {
    const r = await this.reports.parseCsv(ctx.body.csv);
    return r.ok ? { status: 200, data: r.data } : { status: 500, data: r.err };
  }
}

// Checks

// inject() — same instance every time
const db1 = inject(Database);
const db2 = inject(Database);
console.log("inject() singleton:", db1 === db2); // true

// injectNew() — fresh instance every time
const p1 = injectNew(CsvParser);
const p2 = injectNew(CsvParser);
console.log("injectNew() transient:", p1 === p2); // false

// decorator metadata
console.log("@group meta:", group.getMeta(UserHandler));
console.log("@action meta:", action.getMeta(UserHandler, "get"));

// result
await db1.set("u1", "Alice");
console.log("result.ok:", await inject(ReportService).generate("u1"));
console.log("result.fail:", await inject(ReportService).generate("missing"));

// handlers
const uh = new UserHandler();
console.log("user:get hit:", await uh.get({ body: { id: "u1" } }));
console.log("user:get miss:", await uh.get({ body: { id: "x" } }));

const dh = new DataHandler();
console.log("data:parse:", await dh.parse({ body: { csv: "a,b\n1,2" } }));

await new Promise((r) => setTimeout(r, 99999));
