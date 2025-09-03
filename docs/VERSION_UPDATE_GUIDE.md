# NPM Version Update Guide

This guide explains how to update the `@midblck/vercel-tenant-plugin` package version and publish updates to npm.

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

```bash
npm version patch
```

#### **Minor Version (0.1.4 → 0.2.0)**
Use for:
- New features
- New API endpoints
- New configuration options
- Backward-compatible changes

```bash
npm version minor
```

#### **Major Version (0.1.4 → 1.0.0)**
Use for:
- Breaking changes
- Major API changes
- Complete rewrites
- Dropping support for old versions

```bash
npm version major
```

### **Step 3: Update Process**

#### **Automatic Version Update (Recommended)**

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
```

#### **Manual Version Update**

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
# One-liner for patch updates
pnpm build && pnpm test && npm version patch && npm publish --access public
```

### **Full Update Process**

```bash
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
# Fix a bug in the code
# ... make changes ...

# Update patch version
npm version patch
# Version: 0.1.4 → 0.1.5

# Publish
npm publish --access public
```

### **Example 2: New Feature Update**

```bash
# Add a new feature
# ... implement new functionality ...

# Update minor version
npm version minor
# Version: 0.1.5 → 0.2.0

# Publish
npm publish --access public
```

### **Example 3: Breaking Change Update**

```bash
# Make breaking changes
# ... modify API ...

# Update major version
npm version major
# Version: 0.2.0 → 1.0.0

# Publish
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

### Update Process
- [ ] Git working directory clean
- [ ] Version type chosen (patch/minor/major)
- [ ] Version updated (`npm version patch`)
- [ ] Package published (`npm publish --access public`)
- [ ] Git tags pushed (`git push origin main --tags`)

### Post-Update
- [ ] Version available on npm
- [ ] Git tags created
- [ ] Release notes updated
- [ ] Users notified (if major changes)
```

## 🎯 Best Practices

### **Version Naming**

- Use semantic versioning (semver)
- Be consistent with version increments
- Document breaking changes clearly
- Update CHANGELOG.md for each version

### **Release Notes**

Create release notes for each version:

```markdown
## v0.1.5 - Bug Fixes

### Fixed
- Fixed import map resolution for scoped package
- Resolved component registration issues

### Changed
- Updated component paths to use @midblck scope

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
