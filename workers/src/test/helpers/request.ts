import app from "../../index";
import { TEST_ENV } from "../setup";

type Method = "GET" | "POST" | "PUT" | "DELETE";

async function appRequest(
  method: Method,
  path: string,
  options?: {
    headers?: Record<string, string>;
    body?: unknown;
  },
): Promise<Response> {
  const init: RequestInit = { method };

  if (options?.headers) {
    init.headers = options.headers;
  }

  if (options?.body !== undefined) {
    init.body = JSON.stringify(options.body);
  }

  return app.request(path, init, TEST_ENV);
}

export function appGet(
  path: string,
  headers?: Record<string, string>,
): Promise<Response> {
  return appRequest("GET", path, { headers });
}

export function appPost(
  path: string,
  body: unknown,
  headers?: Record<string, string>,
): Promise<Response> {
  return appRequest("POST", path, { headers, body });
}

export function appPut(
  path: string,
  body: unknown,
  headers?: Record<string, string>,
): Promise<Response> {
  return appRequest("PUT", path, { headers, body });
}

export function appDelete(
  path: string,
  headers?: Record<string, string>,
): Promise<Response> {
  return appRequest("DELETE", path, { headers });
}
