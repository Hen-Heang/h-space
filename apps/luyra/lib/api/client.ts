// Thin fetch wrapper shared by every lib/api/* module. Components never call
// fetch() or a repository/service directly — they go through here. When the
// backend becomes Spring Boot, only this file (and the base URL) changes;
// components and their lib/api/* calls stay the same.

export interface ApiErrorBody {
  error: { code: string; message: string };
}

export class ApiError extends Error {
  constructor(public code: string, message: string, public status?: number) {
    super(message);
    this.name = "ApiError";
  }
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

function isApiErrorBody(body: unknown): body is ApiErrorBody {
  const error = (body as { error?: unknown } | null | undefined)?.error;
  return typeof error === "object" && error !== null && typeof (error as { code?: unknown }).code === "string";
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });

  // A non-JSON body means something other than our route handler answered —
  // a login redirect, a proxy/CDN error page, or a platform timeout. Surface
  // it as a typed error with the status instead of an opaque SyntaxError.
  const body = await readJson(response);

  if (!response.ok) {
    if (isApiErrorBody(body)) {
      throw new ApiError(body.error.code, body.error.message, response.status);
    }
    throw new ApiError("HTTP_ERROR", `Request to ${path} failed with status ${response.status}`, response.status);
  }

  if (body === undefined || typeof body !== "object" || body === null || !("data" in body)) {
    throw new ApiError("INVALID_RESPONSE", `Unexpected response from ${path}`, response.status);
  }

  return (body as { data: T }).data;
}
