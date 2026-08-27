export type MutableFixture<T> =
  T extends string ? string
    : T extends number ? number
      : T extends boolean ? boolean
        : T extends readonly (infer Item)[] ? MutableFixture<Item>[]
          : T extends object ? {-readonly [Key in keyof T]: MutableFixture<T[Key]>}
            : T

export function mutableFixture<T>(value: T): MutableFixture<T> {
  return structuredClone(value) as MutableFixture<T>
}

export function addUnknownFixtureField<T extends object>(
  fixture: T,
  key: string,
  value: unknown,
): T & Record<string, unknown> {
  const expanded = fixture as Record<string, unknown>
  expanded[key] = value
  return fixture as T & Record<string, unknown>
}
