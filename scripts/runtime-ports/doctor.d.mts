export interface ComposeOwner {
  containerId?: string
  project: string
  workingDir: string
  configFiles: string[]
  service?: string
  ports?: number[]
}

export interface FixedEndpointReport {
  environment: 'development' | 'prerelease'
  service: 'next' | 'wordpress' | 'web'
  siteId?: 'tio2-a' | 'tio2-b' | 'tio2-my'
  project?: 'wordpress' | 'd16-tio2-my-prerelease'
  composeFile?: string
  host: '127.0.0.1'
  port: 3001 | 3002 | 3003 | 8080 | 3100 | 8180
  state: 'available' | 'expected-owner' | 'unknown-listener' | 'owner-mismatch'
  owner: ComposeOwner | ComposeOwner[] | null
  reason?: 'probe-unavailable' | 'docker-unavailable'
  listening?: boolean
}

export interface DoctorLeaseEvidence {
  lease: {
    schemaVersion: 1
    host: '127.0.0.1'
    ports: number[]
    // Doctor checks the array, but retains invalid PID entries as incomplete evidence.
    processIds: unknown[]
    // Raw metadata is not validated by Doctor; even the filename check coerces leaseId.
    leaseId?: unknown
    runId?: unknown
    purpose?: unknown
    siteId?: unknown
    worktree?: unknown
    commit?: unknown
    composeProject?: unknown
    createdAt?: unknown
    retainUntil?: unknown
  }
  stale: boolean
  evidenceIncomplete: boolean
}

export interface DoctorReport {
  repositoryRoot: string
  fixedEndpoints: FixedEndpointReport[]
  docker: {available: boolean}
  duplicateProjects: string[]
  leases: DoctorLeaseEvidence[]
  leaseError: string | null
  actionsTaken: []
}

export interface DoctorRuntimeOptions {
  leaseRoot?: string
  repositoryRoot?: string
  dockerInspect?: () => Promise<ComposeOwner[]>
  probePort?: (port: number) => Promise<boolean>
}

/** Inspect fixed endpoints and leases without changing runtime state. */
export function doctorRuntime(options?: DoctorRuntimeOptions): Promise<DoctorReport>
