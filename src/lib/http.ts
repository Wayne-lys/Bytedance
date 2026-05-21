export type ApiResponse<T> = {
  ok: boolean;
  data?: T;
  error?: string;
};

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return Response.json({ ok: true, data } satisfies ApiResponse<T>, init);
}

export function jsonError(error: string, status = 400) {
  return Response.json({ ok: false, error } satisfies ApiResponse<never>, {
    status
  });
}
