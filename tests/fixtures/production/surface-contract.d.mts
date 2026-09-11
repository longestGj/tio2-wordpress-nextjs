export interface ProductionSurfaceObject {
  id: string
  name: string
  path: string
  expectedStatus: number
}

export const surface: {
  schemaVersion: string
  siteId: string
  website: string
  cms: string
  objects: ProductionSurfaceObject[]
}

export function canonical(path: string): string
