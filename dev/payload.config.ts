import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { MongoMemoryReplSet } from 'mongodb-memory-server'
import path from 'path'
import { buildConfig } from 'payload'

import { vercelTenantPlugin } from '../src/index'
// import { vercelTenantPlugin } from 'vercel-tenant-plugin'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

import { testEmailAdapter } from './helpers/testEmailAdapter'
import { seed } from './seed'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

if (!process.env.ROOT_DIR) {
  process.env.ROOT_DIR = dirname
}

const config = buildConfig({
  admin: {
    components: {
      views: {
        dashboard: {
          Component: './dashboard#Dashboard',
        },
      },
    },
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  // Configure error logging to be less verbose
  collections: [
    {
      slug: 'posts',
      fields: [],
    },
    {
      slug: 'media',
      fields: [],
      upload: {
        staticDir: path.resolve(dirname, 'media'),
      },
    },
  ],
  db: mongooseAdapter({
    ensureIndexes: true,
    url: process.env.DATABASE_URI || '',
  }),
  debug: false,
  editor: lexicalEditor(),
  email: testEmailAdapter,
  onInit: async (payload) => {
    // Handle memory DB setup for testing
    if (process.env.NODE_ENV === 'test') {
      const memoryDB = await MongoMemoryReplSet.create({
        replSet: {
          count: 3,
          dbName: 'payloadmemory',
        },
      })
      process.env.DATABASE_URI = `${memoryDB.getUri()}&retryWrites=true`
    }

    await seed(payload)
  },
  plugins: [
    vercelTenantPlugin({
      collections: {
        posts: true,
      },
      teamId: process.env.VERCEL_TEAM_ID,
      vercelToken: process.env.VERCEL_TOKEN || 'your_vercel_token_here',
    }),
  ],
  secret: process.env.PAYLOAD_SECRET || 'test-secret_key',
  sharp,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
})

export default config
