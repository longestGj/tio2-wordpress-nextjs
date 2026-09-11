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
    leaseId: string
    runId: string
    purpose: 'feature-next' | 'test-next' | 'test-wordpress' | 'fixture'
    siteId: string | null
    worktree: string
    commit: string
    host: '127.0.0.1'
    ports: number[]
    processIds: number[]
    composeProject: string | null
    createdAt: string
    retainUntil: string | null
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
