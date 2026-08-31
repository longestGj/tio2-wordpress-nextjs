import globalChrome from '@/wordpress/plugins/tio2-site-model/config/tio2-my-global-chrome.json'

type DeepReadonly<T> = T extends readonly (infer Item)[]
  ? readonly DeepReadonly<Item>[]
  : T extends object
    ? {readonly [Key in keyof T]: DeepReadonly<T[Key]>}
    : T

export type Tio2MyGlobalChrome = DeepReadonly<typeof globalChrome>
