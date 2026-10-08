import type { Instrumentation } from "next";

/** Error server (render, server action, route handler) → log error di Pengaturan → Sistem. */
export const onRequestError: Instrumentation.onRequestError = async (error, request) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { logError } = await import("@/lib/error-log");
  const err = error as Error & { digest?: string };
  await logError({
    source: "server",
    message: `${err.name ?? "Error"}: ${err.message ?? String(error)}`,
    digest: err.digest,
    path: `${request.method} ${request.path}`,
    userAgent: request.headers["user-agent"]?.toString() ?? null,
  });
};
