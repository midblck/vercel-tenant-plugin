import type { Payload } from 'payload'

import config from '@payload-config'
import { createPayloadRequest, getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'

import { customEndpointHandler } from '../src/endpoints/customEndpointHandler.js'

let payload: Payload

afterAll(async () => {
  // Clean up payload instance
  if (payload && typeof payload.destroy === 'function') {
    await payload.destroy()
  }
})

beforeAll(async () => {
  payload = await getPayload({ config })
})

describe('Plugin integration tests', () => {
  test('should query custom endpoint added by plugin', async () => {
    const request = new Request('http://localhost:3000/api/my-plugin-endpoint', {
      method: 'GET',
    })

    const payloadRequest = await createPayloadRequest({ config, request })
    const response = await customEndpointHandler(payloadRequest)
    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data).toMatchObject({
      message: 'Hello from custom endpoint',
    })
  })

  test('can create post with vercelTenant relationship field added by plugin', async () => {
    // First create a tenant with a unique project ID
    const uniqueProjectId = `test-project-${Date.now()}`
    const tenant = await payload.create({
      collection: 'tenant',
      data: {
        name: `Test Tenant ${Date.now()}`,
        vercelProjectId: uniqueProjectId,
        status: 'approved',
        isActive: true,
        vercelProjectGitRepository: {
          type: 'github',
          owner: 'test-owner',
          repo: 'test-repo',
          branch: 'main',
        },
      },
    })

    // Then create a post with the vercelTenant relationship
    const post = await payload.create({
      collection: 'posts',
      data: {
        vercelTenant: tenant.id,
      },
    })

    // In PayloadCMS, relationship fields return the full object by default
    expect(post.vercelTenant.id).toBe(tenant.id)
  })

  test('plugin creates tenant collection', async () => {
    expect(payload.collections['tenant']).toBeDefined()
    expect(payload.collections['tenant-envariable']).toBeDefined()
    expect(payload.collections['tenant-deployment']).toBeDefined()
  })
})
