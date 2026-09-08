import {
  buildSubmissionEnvironment,
  type SubmissionEnvironment,
} from "@/lib/forms/submission-environment";
import type { MalaysiaRfqSubmission } from "./malaysia-rfq-receiver";

export type MalaysiaRfqServerReceiverResult = {
  readonly kind:
    "receipt_confirmed" | "submission_unconfirmed" | "service_unavailable";
};
interface Options {
  readonly accessKey: string | null;
  readonly fetcher?: typeof fetch;
  readonly endpoint?: string;
  readonly timeoutMs?: number;
  readonly environment?: SubmissionEnvironment;
}
const WEB3FORMS_ENDPOINT = "https://api.web3forms.com/submit";
export async function submitMalaysiaRfqServerCompatibility(
  submission: MalaysiaRfqSubmission,
  options: Options,
): Promise<MalaysiaRfqServerReceiverResult> {
  if (!options.accessKey?.trim()) return { kind: "service_unavailable" };
  const controller = new AbortController();
  const token = globalThis.crypto?.randomUUID?.() ?? `rfq-${Date.now()}`;
  const environment = buildSubmissionEnvironment(
    options.environment ?? undefined,
    token,
    "TiO2 Malaysia quotation request",
  );
  const timeout = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? 10_000,
  );
  try {
    const response = await (options.fetcher ?? fetch)(
      options.endpoint ?? WEB3FORMS_ENDPOINT,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({
          access_key: options.accessKey,
          subject: environment.subject,
          from_name: "TiO2 Malaysia RFQ",
          email: submission.business_email,
          site_scope: "tio2-my",
          page_id: "CONV-RFQ",
          workflow_type: "rfq",
          locale: "en",
          request_token: token,
          ...environment.fields,
          ...submission,
          source_page_id: submission.source_page_id || undefined,
        }),
        signal: controller.signal,
      },
    );
    if (
      response.status !== 200 ||
      !response.headers.get("content-type")?.includes("application/json")
    )
      return { kind: "submission_unconfirmed" };
    const body = (await response.json()) as { success?: unknown };
    return body.success === true
      ? { kind: "receipt_confirmed" }
      : { kind: "submission_unconfirmed" };
  } catch {
    return { kind: "submission_unconfirmed" };
  } finally {
    clearTimeout(timeout);
  }
}
