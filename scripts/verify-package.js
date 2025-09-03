#!/usr/bin/env node

/**
 * Package verification script for npm publication
 * Run this before publishing to ensure everything is ready
 */

import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

console.log('🔍 Verifying package for npm publication...\n')

// Check if required files exist
const requiredFiles = ['package.json', 'README.md', 'LICENSE', 'dist/index.js', 'dist/index.d.ts']

console.log('📁 Checking required files:')
let allFilesExist = true

requiredFiles.forEach((file) => {
  if (fs.existsSync(file)) {
    console.log(`  ✅ ${file}`)
  } else {
    console.log(`  ❌ ${file} - MISSING`)
    allFilesExist = false
  }
})

// Check package.json content
console.log('\n📦 Checking package.json:')
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))

  // Check required fields
  const requiredFields = ['name', 'version', 'description', 'license', 'main', 'types']
  requiredFields.forEach((field) => {
    if (packageJson[field]) {
      console.log(`  ✅ ${field}: ${packageJson[field]}`)
    } else {
      console.log(`  ❌ ${field} - MISSING`)
      allFilesExist = false
    }
  })

  // Check version format
  if (/^\d+\.\d+\.\d+/.test(packageJson.version)) {
    console.log(`  ✅ Version format is valid`)
  } else {
    console.log(`  ❌ Version format is invalid: ${packageJson.version}`)
    allFilesExist = false
  }

  // Check if name is available (basic check)
  if (packageJson.name && !packageJson.name.includes('@')) {
    console.log(
      `  ⚠️  Package name "${packageJson.name}" is unscoped - consider using @your-username/package-name`,
    )
  }
} catch (error) {
  console.log(`  ❌ Error reading package.json: ${error.message}`)
  allFilesExist = false
}

// Check dist folder structure
console.log('\n🏗️  Checking build output:')
if (fs.existsSync('dist')) {
  const distFiles = fs.readdirSync('dist', { recursive: true })
  console.log(`  ✅ dist/ folder exists with ${distFiles.length} files`)

  // Check for main entry points
  if (fs.existsSync('dist/index.js')) {
    console.log(`  ✅ Main entry point exists`)
  } else {
    console.log(`  ❌ Main entry point missing`)
    allFilesExist = false
  }

  if (fs.existsSync('dist/index.d.ts')) {
    console.log(`  ✅ Type definitions exist`)
  } else {
    console.log(`  ❌ Type definitions missing`)
    allFilesExist = false
  }
} else {
  console.log(`  ❌ dist/ folder missing - run 'pnpm build' first`)
  allFilesExist = false
}

// Check if package can be imported
console.log('\n🧪 Testing package import:')
try {
  // Just check if the file exists and is readable
  const stats = fs.statSync('dist/index.js')
  if (stats.isFile() && stats.size > 0) {
    console.log('  ✅ Main entry point file exists and is readable')
  } else {
    console.log('  ❌ Main entry point file is empty or invalid')
    allFilesExist = false
  }
} catch (error) {
  console.log(`  ❌ Package import test failed: ${error.message}`)
  allFilesExist = false
}

// Final result
console.log('\n' + '='.repeat(50))
if (allFilesExist) {
  console.log('🎉 Package verification PASSED! Ready for publication.')
  console.log('\nNext steps:')
  console.log('1. Update package.json with your actual name and repository URLs')
  console.log('2. Run: npm login')
  console.log('3. Run: npm publish')
} else {
  console.log('❌ Package verification FAILED! Fix the issues above before publishing.')
  process.exit(1)
}
