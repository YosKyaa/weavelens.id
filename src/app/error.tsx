"use client";

import { ErrorRecovery } from "@/components/organisms/ErrorRecovery";

export default function RouteError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorRecovery {...props} />;
}
