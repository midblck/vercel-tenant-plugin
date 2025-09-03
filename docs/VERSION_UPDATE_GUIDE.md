# NPM Version Update Guide

This guide explains how to update the `@midblck/vercel-tenant-plugin` package version and publish updates to npm.

## 🚀 Quick Start

For the fastest update process, use the automated scripts:

```bash
# Bug fixes (0.1.4 → 0.1.5)
pnpm update:patch

# New features (0.1.4 → 0.2.0)
pnpm update:minor

# Breaking changes (0.1.4 → 1.0.0)
pnpm update:major

# Check current version
pnpm version:check
```

These commands automatically handle building, testing, versioning, publishing, and git operations.

## 📦 Current Package Status

- **Package Name**: `@midblck/vercel-tenant-plugin`
- **Current Version**: 0.1.4
- **Total Versions**: 5 (0.1.0, 0.1.1, 0.1.2, 0.1.3, 0.1.4)
- **NPM Package**: https://www.npmjs.com/package/@midblck/vercel-tenant-plugin
- **Repository**: https://github.com/midblck/vercel-tenant-plugin

### **Recent Updates**

- **v0.1.4**: Fixed component registration to use scoped package name
- **v0.1.3**: Fixed RSC exports and added collections export path
- **v0.1.2**: Fixed package exports to point to built files
- **v0.1.1**: Fixed npm badge URL and updated documentation
- **v0.1.0**: Initial release with full functionality

## 📋 Version Update Process

### **Step 1: Pre-Update Checklist**

Before updating the version, ensure:

- [ ] All changes are committed to git
- [ ] Tests pass (`pnpm test`)
- [ ] Build succeeds (`pnpm build`)
- [ ] No linting errors (`pnpm lint`)
- [ ] Documentation is updated if needed
- [ ] Breaking changes are documented

### **Step 2: Choose Version Type**

#### **Patch Version (0.1.4 → 0.1.5)**

Use for:

- Bug fixes
- Small improvements
- Documentation updates
- Non-breaking changes
- Component registration fixes

```bash
# Automated (Recommended)
pnpm update:patch

# Manual
npm version patch
```

#### **Minor Version (0.1.4 → 0.2.0)**

Use for:

- New features
- New API endpoints
- New configuration options
- Backward-compatible changes
- New export paths

```bash
# Automated (Recommended)
pnpm update:minor

# Manual
npm version minor
```

#### **Major Version (0.1.4 → 1.0.0)**

Use for:

- Breaking changes
- Major API changes
- Complete rewrites
- Dropping support for old versions
- Package structure changes

```bash
# Automated (Recommended)
pnpm update:major

# Manual
npm version major
```

### **Step 3: Update Process**

#### **Automatic Version Update (Recommended)**

```bash
# One command for complete update process
pnpm update:patch    # for bug fixes
pnpm update:minor    # for new features
pnpm update:major    # for breaking changes
```

The automated script handles:

1. ✅ Building the package
2. ✅ Running tests
3. ✅ Updating version in package.json
4. ✅ Creating git tag
5. ✅ Publishing to npm
6. ✅ Pushing to git repository
7. ✅ Providing status feedback

#### **Manual Version Update (Alternative)**

```bash
# 1. Build the package
pnpm build

# 2. Run tests
pnpm test

# 3. Update version (choose one)
npm version patch    # for bug fixes
npm version minor    # for new features
npm version major    # for breaking changes

# 4. Publish to npm
npm publish --access public

# 5. Push to git
git push origin main --tags
```

#### **Manual Version Update (Advanced)**

```bash
# 1. Edit package.json manually
# Change "version": "0.1.4" to "version": "0.1.5"

# 2. Build and test
pnpm build
pnpm test

# 3. Commit changes
git add package.json
git commit -m "Bump version to 0.1.5"

# 4. Create git tag
git tag v0.1.5

# 5. Push changes and tags
git push origin main
git push origin v0.1.5

# 6. Publish to npm
npm publish --access public
```

## 🔄 Complete Update Workflow

### **Quick Update (Patch)**

```bash
# Automated (Recommended)
pnpm update:patch

# Manual one-liner
pnpm build && pnpm test && npm version patch && npm publish --access public
```

### **Full Update Process**

```bash
# Automated (Recommended)
pnpm update:patch  # or update:minor/update:major

# Manual process
# 1. Ensure clean working directory
git status

# 2. Build and test
pnpm build
pnpm test

# 3. Commit any pending changes
git add .
git commit -m "Prepare for version update"

# 4. Update version
npm version patch  # or minor/major

# 5. Publish to npm
npm publish --access public

# 6. Push to git
git push origin main --tags
```

## 📝 Version Update Examples

### **Example 1: Bug Fix Update**

```bash
# Fix a bug in the code (e.g., component registration)
# ... make changes ...

# Automated update
pnpm update:patch
# Version: 0.1.4 → 0.1.5
# Automatically: builds, tests, versions, publishes, pushes

# Manual update
npm version patch
npm publish --access public
```

### **Example 2: New Feature Update**

```bash
# Add a new feature (e.g., new export path)
# ... implement new functionality ...

# Automated update
pnpm update:minor
# Version: 0.1.5 → 0.2.0
# Automatically: builds, tests, versions, publishes, pushes

# Manual update
npm version minor
npm publish --access public
```

### **Example 3: Breaking Change Update**

```bash
# Make breaking changes (e.g., API changes)
# ... modify API ...

# Automated update
pnpm update:major
# Version: 0.2.0 → 1.0.0
# Automatically: builds, tests, versions, publishes, pushes

# Manual update
npm version major
npm publish --access public
```

## 🏷️ Git Tag Management

### **View Tags**

```bash
# List all tags
git tag

# List tags with versions
git tag -l "v*"

# Show tag details
git show v0.1.5
```

### **Delete Tags (if needed)**

```bash
# Delete local tag
git tag -d v0.1.5

# Delete remote tag
git push origin :refs/tags/v0.1.5
```

## 📊 Version History Tracking

### **View Version History**

```bash
# View npm package versions
npm view @midblck/vercel-tenant-plugin versions

# View latest version info
npm view @midblck/vercel-tenant-plugin@latest

# View specific version
npm view @midblck/vercel-tenant-plugin@0.1.5
```

### **Compare Versions**

```bash
# Compare two versions
npm view @midblck/vercel-tenant-plugin@0.1.4
npm view @midblck/vercel-tenant-plugin@0.1.5
```

## 🚨 Troubleshooting

### **Common Issues**

#### **1. Version Already Exists**

```bash
# Error: version 0.1.5 already exists
# Solution: Use a different version number
npm version patch  # This will increment to 0.1.6
```

#### **2. Git Working Directory Not Clean**

```bash
# Error: Git working directory not clean
# Solution: Commit or stash changes
git add .
git commit -m "Your changes"
# Then run npm version patch
```

#### **3. Authentication Issues**

```bash
# Error: ENEEDAUTH
# Solution: Login to npm
npm login
npm whoami  # Verify you're logged in
```

#### **4. Package Name Conflicts**

```bash
# Error: Package name already taken
# Solution: Use scoped package (already done)
# @midblck/vercel-tenant-plugin is scoped and available
```

### **Recovery Steps**

If something goes wrong:

```bash
# 1. Check current status
npm view @midblck/vercel-tenant-plugin@latest

# 2. If version was published but git tag is missing
git tag v0.1.5
git push origin v0.1.5

# 3. If version was incremented but not published
npm publish --access public

# 4. If you need to unpublish (within 24 hours)
npm unpublish @midblck/vercel-tenant-plugin@0.1.5
```

## 🤖 Automation Script Details

### **Update Script Features**

The `scripts/update-version.js` script provides:

- ✅ **Automatic building** with `pnpm build`
- ✅ **Test execution** with `pnpm test`
- ✅ **Version bumping** with `npm version`
- ✅ **NPM publishing** with `npm publish --access public`
- ✅ **Git tag creation** and pushing
- ✅ **Error handling** and validation
- ✅ **Status feedback** for each step

### **Script Usage**

```bash
# Direct script usage
node scripts/update-version.js patch
node scripts/update-version.js minor
node scripts/update-version.js major
node scripts/update-version.js check

# Via package.json scripts (Recommended)
pnpm update:patch
pnpm update:minor
pnpm update:major
pnpm version:check
```

## 📋 Update Checklist Template

Copy this checklist for each update:

```markdown
## Version Update Checklist - v0.1.5

### Pre-Update

- [ ] Code changes completed
- [ ] Tests pass (`pnpm test`)
- [ ] Build succeeds (`pnpm build`)
- [ ] No linting errors (`pnpm lint`)
- [ ] Documentation updated
- [ ] Breaking changes documented
- [ ] CHANGELOG.md updated

### Update Process

- [ ] Git working directory clean
- [ ] Version type chosen (patch/minor/major)
- [ ] Automated update executed (`pnpm update:patch`)
- [ ] OR manual process completed

### Post-Update

- [ ] Version available on npm
- [ ] Git tags created and pushed
- [ ] CHANGELOG.md reflects new version
- [ ] Release notes updated (if needed)
- [ ] Users notified (if major changes)
```

## 🎯 Best Practices

### **Version Naming**

- Use semantic versioning (semver)
- Be consistent with version increments
- Document breaking changes clearly
- Update CHANGELOG.md for each version
- Use automated scripts for consistency

### **Release Notes**

Create release notes for each version:

```markdown
## v0.1.5 - Bug Fixes

### Fixed

- Fixed component registration to use scoped package name
- Resolved import map generation issues
- Fixed RSC exports for better compatibility

### Changed

- Updated component paths in plugin registration
- Enhanced package exports configuration

### Security

- No security updates in this release
```

### **Testing Before Release**

```bash
# Always test before publishing
pnpm build
pnpm test
pnpm lint

# Test the built package locally
npm pack
npm install ./midblck-vercel-tenant-plugin-0.1.5.tgz
```

## 🔗 Useful Commands

### **Version Management**

```bash
# Check current version
npm view @midblck/vercel-tenant-plugin version

# Check all versions
npm view @midblck/vercel-tenant-plugin versions

# Update to latest
npm install @midblck/vercel-tenant-plugin@latest

# Install specific version
npm install @midblck/vercel-tenant-plugin@0.1.5
```

### **Development Commands**

```bash
# Build for development
pnpm build

# Build with watching
pnpm build:watch

# Run tests
pnpm test

# Run linting
pnpm lint

# Clean build files
pnpm clean
```

## 📚 Additional Resources

- [Semantic Versioning](https://semver.org/)
- [NPM Version Command](https://docs.npmjs.com/cli/v8/commands/npm-version)
- [NPM Publish Command](https://docs.npmjs.com/cli/v8/commands/npm-publish)
- [Git Tagging](https://git-scm.com/book/en/v2/Git-Basics-Tagging)

---

**Remember**: Always test thoroughly before publishing a new version!
