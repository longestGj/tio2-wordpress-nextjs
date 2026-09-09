import {
  buildSubmissionEnvironment,
  type SubmissionEnvironment,
} from "@/lib/forms/submission-environment";
import {
  submitWeb3FormsBrowser,
  type Web3FormsBrowserResult,
} from "@/lib/forms/web3forms-browser";
import type { MalaysiaRfqValues } from "./malaysia-rfq-validation";

export interface MalaysiaRfqSubmission extends MalaysiaRfqValues {
  readonly source_page_id: string | null;
  readonly interest?: string | null;
}
interface SubmitOptions {
  readonly accessKey: string | null;
  readonly requestToken: string;
  readonly fetcher?: typeof fetch;
  readonly timeoutMs?: number;
  readonly environment?: SubmissionEnvironment;
}
export const MALAYSIA_RFQ_SUBMISSION_TIMEOUT_MS = 10_000;

export function submitMalaysiaRfq(
  submission: MalaysiaRfqSubmission,
  options: SubmitOptions,
): Promise<Web3FormsBrowserResult> {
  const environment = buildSubmissionEnvironment(
    options.environment ?? undefined,
    options.requestToken,
    "TiO2 Malaysia quotation request",
  );
  return submitWeb3FormsBrowser(
    {
      workflow: "rfq",
      accessKey: options.accessKey?.trim() || null,
      requestToken: options.requestToken,
      timeoutMs: options.timeoutMs ?? MALAYSIA_RFQ_SUBMISSION_TIMEOUT_MS,
      payload: {
        subject: environment.subject,
        from_name: "TiO2 Malaysia RFQ",
        email: submission.business_email,
        site_scope: "tio2-my",
        page_id: "CONV-RFQ",
        workflow_type: "rfq",
        locale: "en",
        request_token: options.requestToken,
        ...environment.fields,
        grade_id: submission.grade_id,
        application_id: submission.application_id,
        quantity_mt: submission.quantity_mt,
        quantity_unit: "MT",
        destination_country: submission.destination_country,
        destination_port_city: submission.destination_port_city,
        company_name: submission.company_name,
        contact_name: submission.contact_name,
        business_email: submission.business_email,
        phone_whatsapp: submission.phone_whatsapp,
        website: submission.website,
        additional_requirements: submission.additional_requirements,
        ...(submission.source_page_id
          ? { source_page_id: submission.source_page_id }
          : {}),
        ...(submission.interest === "alternative-origin-sourcing"
          ? { interest: submission.interest }
          : {}),
      },
    },
    { fetcher: options.fetcher },
  );
}
