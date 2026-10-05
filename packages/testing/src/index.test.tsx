import { describe, expect, it } from 'vitest'
import { waitForRemoteLoad } from './index.js'

describe('waitForRemoteLoad', () => {
  it('returns once the condition becomes true', async () => {
    let ready = false
    const timer = setTimeout(() => {
      ready = true
    }, 25)

    await waitForRemoteLoad(() => ready, 500)
    clearTimeout(timer)

    expect(ready).toBe(true)
  })

  it('rejects after the timeout expires', async () => {
    await expect(waitForRemoteLoad(() => false, 25)).rejects.toThrow(
      'Remote module load timeout'
    )
  })
})
