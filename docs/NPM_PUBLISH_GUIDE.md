# NPM Publishing Guide for Vercel Tenant Plugin

This guide provides step-by-step instructions for publishing your Payload CMS Vercel Tenant Plugin to npm.

## 📋 Pre-Publication Checklist

### ✅ Current Status Analysis

**What's Already Ready:**

- ✅ Comprehensive `package.json` with proper configuration
- ✅ TypeScript configuration with proper build setup
- ✅ SWC build configuration for optimized output
- ✅ Comprehensive README.md with detailed documentation
- ✅ Proper project structure with source code in `src/`
- ✅ Build scripts configured (`build`, `prepublishOnly`)
- ✅ Proper exports configuration for different entry points
- ✅ Peer dependencies correctly set for Payload CMS
- ✅ Development and testing setup

**What Needs to be Added/Fixed:**

- ✅ LICENSE file exists and is properly configured
- ✅ Package name is set to @midblck/vercel-tenant-plugin (scoped)
- ✅ Version is set to 0.1.0 for initial release
- ❌ Need to verify npm account and authentication for midblck organization

## 🚀 Step-by-Step Publishing Process

### Step 1: Create Missing Files

#### 1.1 LICENSE File Status

✅ **LICENSE file already exists and is properly configured**

The LICENSE file is already present with the correct MIT license and midblck copyright information.

### Step 2: Update Package Configuration

#### 2.1 Package.json Status

✅ **package.json is already properly configured for midblck**

The package.json already contains the correct configuration:

```json
{
  "name": "@midblck/vercel-tenant-plugin",
  "version": "0.1.0",
  "description": "A PayloadCMS v3 plugin to integrate with Vercel API and manage tenant projects",
  "keywords": ["payloadcms", "vercel", "plugin", "multi-tenant", "deployment", "cms"],
  "author": "midblck",
  "homepage": "https://github.com/midblck/vercel-tenant-plugin#readme",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/midblck/vercel-tenant-plugin.git"
  },
  "bugs": {
    "url": "https://github.com/midblck/vercel-tenant-plugin/issues"
  }
}
```

#### 2.2 Verify Package Name Availability

```bash
# Check if package name is available
npm view @midblck/vercel-tenant-plugin
# If it returns 404, the name is available
# If it returns package info, you need a different name
```

### Step 3: Prepare for Publication

#### 3.1 Clean and Build

```bash
# Clean previous builds
pnpm clean

# Build the package
pnpm build

# Verify the dist folder contains all necessary files
ls -la dist/
```

#### 3.2 Test the Build

```bash
# Test that the built package works
cd dist
node -e "console.log(require('./index.js'))"
```

#### 3.3 Run Tests

```bash
# Run all tests to ensure everything works
pnpm test
```

### Step 4: NPM Account Setup

#### 4.1 Create NPM Account (if needed)

1. Go to [npmjs.com](https://www.npmjs.com)
2. Sign up for an account
3. Verify your email address

**For midblck organization:**
- Ensure you have access to the `@midblck` npm organization
- If you don't have access, contact the organization owner to add you as a member
- Verify you can publish packages under the `@midblck` scope

#### 4.2 Login to NPM

```bash
# Login to npm
npm login

# Verify you're logged in
npm whoami
```

#### 4.3 Enable 2FA (Recommended)

```bash
# Enable 2FA for your npm account
npm profile enable-2fa auth-and-writes
```

### Step 5: Pre-Publication Verification

#### 5.1 Check Package Contents

```bash
# See what will be published
npm pack --dry-run
```

#### 5.2 Verify Package.json

```bash
# Validate package.json
npm pack --dry-run | head -20
```

#### 5.3 Test Installation Locally

```bash
# Pack the package
npm pack

# Install it in a test directory
mkdir test-install
cd test-install
npm init -y
npm install ../@midblck/vercel-tenant-plugin-0.1.0.tgz

# Test that it can be imported
node -e "const plugin = require('@midblck/vercel-tenant-plugin'); console.log('Plugin loaded successfully')"
```

### Step 6: Publish to NPM

#### 6.1 Final Build and Publish

```bash
# Make sure you're in the project root
cd /path/to/your/plugin

# Clean and build
pnpm clean && pnpm build

# Publish to npm
npm publish

# For scoped packages (required for @midblck)
npm publish --access public
```

#### 6.2 Verify Publication

```bash
# Check that your package is published
npm view @midblck/vercel-tenant-plugin

# Test installation from npm
npm install @midblck/vercel-tenant-plugin
```

### Step 7: Post-Publication Tasks

#### 7.1 Create GitHub Release

1. Go to your GitHub repository
2. Click "Releases" → "Create a new release"
3. Tag version: `v0.1.0`
4. Release title: `v0.1.0 - Initial Release`
5. Add release notes from your CHANGELOG

#### 7.2 Update Documentation

✅ **README.md is already updated with correct installation commands**

The README.md already contains the correct @midblck/vercel-tenant-plugin package name in all installation examples.

#### 7.3 Set Up CI/CD (Optional)

Create `.github/workflows/publish.yml`:

```yaml
name: Publish to NPM

on:
  release:
    types: [published]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          registry-url: 'https://registry.npmjs.org'
      - run: pnpm install
      - run: pnpm build
      - run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## 🔧 Configuration Files Summary

### Required Files for NPM Publication:

- ✅ `package.json` - Package configuration
- ✅ `README.md` - Documentation
- ✅ `LICENSE` - License file (already exists)
- ✅ `tsconfig.json` - TypeScript configuration
- ✅ `.swcrc` - Build configuration
- ✅ `src/` - Source code
- ✅ `dist/` - Built files (generated)

### Optional but Recommended:

- `.github/workflows/` - CI/CD configuration
- `CHANGELOG.md` - Version history
- `.npmignore` - Files to exclude from package

## 🚨 Common Issues and Solutions

### Issue 1: Package Name Already Taken

**Solution:** Use a scoped package name:

```json
{
  "name": "@midblck/vercel-tenant-plugin"
}
```

### Issue 2: Build Errors

**Solution:** Check TypeScript configuration and ensure all dependencies are properly installed:

```bash
pnpm install
pnpm build
```

### Issue 3: Missing Files in Package

**Solution:** Check the `files` field in package.json and ensure all necessary files are included:

```json
{
  "files": ["dist", "README.md", "LICENSE"]
}
```

### Issue 4: Authentication Issues

**Solution:** Re-login to npm and verify 2FA settings:

```bash
npm logout
npm login
npm whoami
```

## 📊 Package Size Optimization

### Current Package Structure:

- Source code: `src/` (excluded from package)
- Built code: `dist/` (included in package)
- Documentation: `README.md` (included)
- License: `LICENSE` (will be included)

### Optimization Tips:

1. Use `.npmignore` to exclude unnecessary files
2. Ensure only `dist/` folder is included in the package
3. Minimize dependencies in `dependencies` vs `devDependencies`

## 🎯 Next Steps After Publication

1. **Monitor Downloads**: Check npm stats for your package
2. **Gather Feedback**: Monitor GitHub issues and npm comments
3. **Plan Updates**: Create roadmap for future versions
4. **Documentation**: Keep README and examples updated
5. **Community**: Engage with users and contributors

## 📝 Version Management

### Semantic Versioning:

- `0.1.0` - Initial release
- `0.1.1` - Bug fixes
- `0.2.0` - New features
- `1.0.0` - Stable release

### Publishing Updates:

```bash
# Update version
npm version patch  # 0.1.0 → 0.1.1
npm version minor  # 0.1.1 → 0.2.0
npm version major  # 0.2.0 → 1.0.0

# Publish
npm publish
```

---

## 🎉 Congratulations!

Once you complete these steps, your Payload CMS Vercel Tenant Plugin will be available on npm for the community to use. Make sure to:

1. Share it on social media
2. Add it to Payload CMS plugin directories
3. Write blog posts about it
4. Engage with the community

Good luck with your publication! 🚀
