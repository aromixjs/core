export interface RequestInfo {
  body: unknown;
  headers: Record<string, string | string[] | undefined>;
  ip: string;
  action: string;
}


export interface ResponsePayload {
  status: number;
  data?: unknown;
  redirect?: string;
}


export interface ResponseMethods {
  send<T>(payload: { status: number; data: T }): ResponsePayload;
  end(status?: number): ResponsePayload;
  redirect(url: string, status?: 301 | 302 | 307 | 308): ResponsePayload;
}
export type RequestContext = RequestInfo & ResponseMethods;