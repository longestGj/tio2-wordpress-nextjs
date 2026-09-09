import {
  buildSubmissionEnvironment,
  type SubmissionEnvironment,
} from "@/lib/forms/submission-environment";
import {
  submitWeb3FormsBrowser,
  type Web3FormsBrowserResult,
} from "@/lib/forms/web3forms-browser";
import {
  normalizeMalaysiaRequestDocumentsValues,
  validateMalaysiaRequestDocumentsValues,
  type MalaysiaRequestDocumentsErrors,
  type MalaysiaRequestDocumentsValues,
} from "./malaysia-request-documents-validation";
export type MalaysiaRequestDocumentsReceiverResult =
  | Web3FormsBrowserResult
  | {
      readonly kind: "validation_failed";
      readonly errors: MalaysiaRequestDocumentsErrors;
    };
interface ReceiverOptions {
  readonly accessKey: string | null;
  readonly requestToken: string;
  readonly sourcePageId: string | null;
  readonly marketId: string | null;
  readonly fetcher?: typeof fetch;
  readonly timeoutMs?: number;
  readonly environment?: SubmissionEnvironment;
}
const MAX_PROVIDER_PAYLOAD_BYTES = 16 * 1024;
export const MALAYSIA_REQUEST_DOCUMENTS_SUBMISSION_TIMEOUT_MS = 12_000;
export function submitMalaysiaRequestDocuments(
  values: MalaysiaRequestDocumentsValues,
  options: ReceiverOptions,
): Promise<MalaysiaRequestDocumentsReceiverResult> {
  const validation = validateMalaysiaRequestDocumentsValues(values);
  if (!validation.valid)
    return Promise.resolve({
      kind: "validation_failed",
      errors: validation.errors,
    });
  const accessKey = options.accessKey;
  if (!accessKey)
    return submitWeb3FormsBrowser(
      {
        workflow: "documents",
        accessKey,
        requestToken: options.requestToken,
        timeoutMs:
          options.timeoutMs ?? MALAYSIA_REQUEST_DOCUMENTS_SUBMISSION_TIMEOUT_MS,
        payload: {},
      },
      { fetcher: options.fetcher },
    );
  const normalized = normalizeMalaysiaRequestDocumentsValues(values);
  const environment = buildSubmissionEnvironment(
    options.environment ?? undefined,
    options.requestToken,
    "TiO2 Malaysia document request",
  );
  const payload = {
    subject: environment.subject,
    from_name: "TiO2 Malaysia Request Documents",
    email: normalized.business_email,
    ...normalized,
    site_scope: "tio2-my",
    page_id: "CONV-DOC",
    workflow_type: "documents",
    locale: "en",
    request_token: options.requestToken,
    ...environment.fields,
    ...(options.sourcePageId ? { source_page_id: options.sourcePageId } : {}),
    ...(options.marketId ? { market_id: options.marketId } : {}),
  };
  if (
    new TextEncoder().encode(
      JSON.stringify({ ...payload, access_key: options.accessKey }),
    ).byteLength > MAX_PROVIDER_PAYLOAD_BYTES
  )
    return Promise.resolve({
      kind: "submission_unconfirmed",
      diagnostic: {
        workflow: "documents",
        requestToken: options.requestToken,
        httpStatus: null,
        mediaType: null,
        outcome: "submission_unconfirmed",
        providerCategory: "unexpected",
      },
    });
  return submitWeb3FormsBrowser(
    {
      workflow: "documents",
      accessKey,
      requestToken: options.requestToken,
      timeoutMs:
        options.timeoutMs ?? MALAYSIA_REQUEST_DOCUMENTS_SUBMISSION_TIMEOUT_MS,
      payload,
    },
    { fetcher: options.fetcher },
  );
}
