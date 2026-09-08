import {
  buildSubmissionEnvironment,
  type SubmissionEnvironment,
} from "@/lib/forms/submission-environment";
import {
  submitWeb3FormsBrowser,
  type Web3FormsBrowserResult,
} from "@/lib/forms/web3forms-browser";
import {
  validateMalaysiaSampleRequest,
  type MalaysiaSampleRequestErrors,
  type MalaysiaSampleRequestValues,
} from "./malaysia-request-sample-validation";
export type MalaysiaSampleReceiverResult =
  | Web3FormsBrowserResult
  | {
      readonly kind: "validation_failed";
      readonly errors: MalaysiaSampleRequestErrors;
    };
export interface MalaysiaSampleSourceContext {
  readonly source_page_id?: string;
  readonly market_id?: string;
  readonly process_context?: string;
  readonly resource_context?: string;
}
interface Options {
  readonly accessKey: string | null;
  readonly requestToken: string;
  readonly sourceContext?: MalaysiaSampleSourceContext;
  readonly fetcher?: typeof fetch;
  readonly timeoutMs?: number;
  readonly environment?: SubmissionEnvironment;
}
export const MALAYSIA_SAMPLE_SUBMISSION_TIMEOUT_MS = 12_000;
const trim = (value: string) => value.trim();
export function submitMalaysiaSampleRequest(
  values: MalaysiaSampleRequestValues,
  options: Options,
): Promise<MalaysiaSampleReceiverResult> {
  const errors = validateMalaysiaSampleRequest(values);
  if (Object.keys(errors).length)
    return Promise.resolve({ kind: "validation_failed", errors });
  const environment = buildSubmissionEnvironment(
    options.environment ?? undefined,
    options.requestToken,
    "TiO2 Malaysia sample request",
  );
  const context = options.sourceContext;
  return submitWeb3FormsBrowser(
    {
      workflow: "sample",
      accessKey: options.accessKey?.trim() || null,
      requestToken: options.requestToken,
      timeoutMs: options.timeoutMs ?? MALAYSIA_SAMPLE_SUBMISSION_TIMEOUT_MS,
      payload: {
        subject: environment.subject,
        from_name: "TiO2 Malaysia Request a Sample",
        email: trim(values.business_email),
        site_scope: "tio2-my",
        page_id: "CONV-SAMPLE",
        workflow_type: "sample",
        locale: "en",
        request_token: options.requestToken,
        ...environment.fields,
        grade_id: values.grade_id,
        application_id: values.application_id,
        ...(values.application_id === "other"
          ? { application_other: trim(values.application_other) }
          : {}),
        test_objective: trim(values.test_objective),
        ...(trim(values.current_grade_or_target)
          ? { current_grade_or_target: trim(values.current_grade_or_target) }
          : {}),
        contact_name: trim(values.contact_name),
        company_organisation: trim(values.company_organisation),
        business_email: trim(values.business_email),
        destination_country_market: trim(values.destination_country_market),
        ...(trim(values.expected_project_annual_use)
          ? {
              expected_project_annual_use: trim(
                values.expected_project_annual_use,
              ),
            }
          : {}),
        documents_needed: [...new Set(values.documents_needed)],
        ...(trim(values.additional_context)
          ? { additional_context: trim(values.additional_context) }
          : {}),
        ...(context?.source_page_id?.trim()
          ? { source_page_id: context.source_page_id.trim() }
          : {}),
        ...(context?.market_id?.trim()
          ? { market_id: context.market_id.trim() }
          : {}),
        ...(context?.process_context?.trim()
          ? { process_context: context.process_context.trim() }
          : {}),
        ...(context?.resource_context?.trim()
          ? { resource_context: context.resource_context.trim() }
          : {}),
      },
    },
    { fetcher: options.fetcher },
  );
}
