import type { PayloadRequest } from 'payload'

export const customEndpointHandler = async (req: PayloadRequest) => {
  return new Response(
    JSON.stringify({
      message: 'Hello from custom endpoint',
    }),
    {
      headers: {
        'Content-Type': 'application/json',
      },
      status: 200,
    },
  )
}
