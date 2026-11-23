import type { ActionError } from "@/lib/errors";
import { Alert } from "./ui";

export function FormError({ error }: { error: ActionError | null }) {
  if (!error) return null;
  const retry = error.retryAfterSeconds ? ` (thử lại sau khoảng ${Math.ceil(error.retryAfterSeconds / 60)} phút)` : "";
  return (
    <Alert tone="danger">
      {error.message}
      {retry}
      {error.details?.length ? (
        <ul className="mt-2 list-disc pl-5">
          {error.details.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      ) : null}
      {error.requestId && error.code === "INTERNAL_ERROR" ? <span className="block text-xs opacity-70">Mã yêu cầu: {error.requestId}</span> : null}
    </Alert>
  );
}
