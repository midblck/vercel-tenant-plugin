#!/usr/bin/env node

/**
 * Version Update Script for @midblck/vercel-tenant-plugin
 * 
 * Usage:
 *   node scripts/update-version.js patch    # 0.1.4 → 0.1.5
 *   node scripts/update-version.js minor    # 0.1.4 → 0.2.0
 *   node scripts/update-version.js major    # 0.1.4 → 1.0.0
 *   node scripts/update-version.js check    # Check current version
 */

import { execSync } from 'child_process'
import fs from 'fs'

const versionType = process.argv[2]

if (!versionType) {
  console.log('❌ Please specify version type: patch, minor, major, or check')
  console.log('Usage: node scripts/update-version.js <patch|minor|major|check>')
  process.exit(1)
}

// Read current version from package.json
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))
const currentVersion = packageJson.version

console.log(`📦 Current version: ${currentVersion}`)

if (versionType === 'check') {
  console.log('✅ Version check complete')
  process.exit(0)
}

// Validate version type
if (!['patch', 'minor', 'major'].includes(versionType)) {
  console.log('❌ Invalid version type. Use: patch, minor, or major')
  process.exit(1)
}

console.log(`🚀 Starting ${versionType} version update...`)

try {
  // Step 1: Build the package
  console.log('📦 Building package...')
  execSync('pnpm build', { stdio: 'inherit' })
  console.log('✅ Build successful')

  // Step 2: Run tests
  console.log('🧪 Running tests...')
  execSync('pnpm test', { stdio: 'inherit' })
  console.log('✅ Tests passed')

  // Step 3: Update version
  console.log(`📝 Updating ${versionType} version...`)
  const newVersion = execSync(`npm version ${versionType}`, { encoding: 'utf8' }).trim()
  console.log(`✅ Version updated to ${newVersion}`)

  // Step 4: Publish to npm
  console.log('📤 Publishing to npm...')
  execSync('npm publish --access public', { stdio: 'inherit' })
  console.log('✅ Published to npm')

  // Step 5: Push to git
  console.log('📤 Pushing to git...')
  execSync('git push origin main --tags', { stdio: 'inherit' })
  console.log('✅ Pushed to git')

  console.log('🎉 Version update complete!')
  console.log(`📦 Package: @midblck/vercel-tenant-plugin@${newVersion}`)
  console.log(`🔗 NPM: https://www.npmjs.com/package/@midblck/vercel-tenant-plugin`)

} catch (error) {
  console.error('❌ Version update failed:', error.message)
  process.exit(1)
}
