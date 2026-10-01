"use client";

import { ErrorRecovery } from "@/components/organisms/ErrorRecovery";
import "./globals.css";

/** Error di root layout: harus merender <html> & <body> sendiri. */
export default function GlobalError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="id">
      <body>
        <ErrorRecovery {...props} />
      </body>
    </html>
  );
}
