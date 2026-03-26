export class ResponseBuilder {
  private headers: Record<string, string> = {};
  private status = 200;
  private data: unknown;
  private cookies: Record<string, string> = {};

  setHeader(name: string, value: string): this {
    this.headers[name.toLowerCase()] = value;
    return this;
  }

  setHeaders(headers: Record<string, string>): this {
    for (const [k, v] of Object.entries(headers)) {
      this.headers[k.toLowerCase()] = v;
    }
    return this;
  }

  ok(data?: unknown): this {
    this.status = 200;
    this.data = data;
    return this;
  }
  created(data?: unknown): this {
    this.status = 201;
    this.data = data;
    return this;
  }
  noContent(): this {
    this.status = 204;
    return this;
  }
  badRequest(error?: string): this {
    this.status = 400;
    this.data = { error };
    return this;
  }
  unauthorized(error?: string): this {
    this.status = 401;
    this.data = { error };
    return this;
  }
  forbidden(error?: string): this {
    this.status = 403;
    this.data = { error };
    return this;
  }
  notFound(error?: string): this {
    this.status = 404;
    this.data = { error };
    return this;
  }
  conflict(error?: string): this {
    this.status = 409;
    this.data = { error };
    return this;
  }
  unprocessable(error?: string): this {
    this.status = 422;
    this.data = { error };
    return this;
  }
  internalError(error?: string): this {
    this.status = 500;
    this.data = { error };
    return this;
  }
  custom(status: number, data?: unknown): this {
    this.status = status;
    this.data = data;
    return this;
  }

  toReplyValue() {
    return Object.freeze({
      status: this.status,
      data: this.data,
      headers: { ...this.headers },
    });
  }
}

export const res = new ResponseBuilder();

export const response = new ResponseBuilder();
