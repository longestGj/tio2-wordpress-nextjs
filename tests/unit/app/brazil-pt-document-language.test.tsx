import {expect, it, vi} from 'vitest'

vi.mock('next/font/google', () => ({Inter: () => ({variable: '--font-my-shared-test'})}))
vi.mock('next/font/local', () => ({default: () => ({variable: '--font-my-shared-test'})}))

it('uses a dedicated pt-BR root document while preserving the shared Malaysia body font', async () => {
  vi.stubEnv('SITE_ID', 'tio2-my')
  vi.resetModules()
  const {default: layout} = await import('@/app/pt-br/layout')
  const result = layout({children: <main/>})
  expect(result.type).toBe('html')
  expect(result.props.lang).toBe('pt-BR')
  expect(result.props.children.type).toBe('body')
  expect(result.props.children.props.className).toBe('--font-my-shared-test')
})
