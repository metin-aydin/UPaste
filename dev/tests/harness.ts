// Küçük test yardımcıları: test(), eşitlik denetimi ve sonuç özeti.
import { deepStrictEqual } from 'node:assert'

type Case = { name: string; fn: () => unknown | Promise<unknown> }
const cases: Case[] = []

export function test(name: string, fn: () => unknown | Promise<unknown>): void {
  cases.push({ name, fn })
}

export function eq(actual: unknown, expected: unknown, message?: string): void {
  deepStrictEqual(actual, expected, message)
}

export function ok(value: unknown, message?: string): void {
  if (!value) throw new Error(message ?? `expected truthy, got ${String(value)}`)
}

export async function run(title: string): Promise<void> {
  let failed = 0
  for (const c of cases) {
    try {
      await c.fn()
      console.log(`  ✓ ${c.name}`)
    } catch (err) {
      failed++
      console.log(`  ✗ ${c.name}\n    ${(err as Error).stack ?? err}`)
    }
  }
  console.log(`${title}: ${cases.length - failed}/${cases.length}`)
  if (failed) process.exitCode = 1
}
