# Development Guide for Vercel Tenant Plugin

This guide explains how to develop and test the `@midblck/vercel-tenant-plugin` locally.

## 🚀 Quick Start

### 1. Development Mode (Recommended)

For active development, use the local source files:

```bash
# Start development with auto-rebuild
pnpm dev:plugin
```

This will:

- Watch for changes in `src/` and auto-rebuild
- Start the Payload dev server
- Use local source files instead of npm package

### 2. Manual Development

If you prefer manual control:

```bash
# Build the plugin
pnpm build

# Start Payload dev server
pnpm dev
```

## 🔧 Development Workflow

### **Local Development (Recommended)**

1. **Edit source files** in `src/`
2. **Changes auto-rebuild** (if using `pnpm dev:plugin`)
3. **Test in browser** at `http://localhost:3000/admin`
4. **Iterate quickly** without publishing

### **Testing Published Package**

1. **Build and publish**:

   ```bash
   pnpm build
   npm version patch
   npm publish --access public
   ```

2. **Switch to published version** in `dev/payload.config.ts`:

   ```typescript
   import { vercelTenantPlugin } from '@midblck/vercel-tenant-plugin'
   ```

3. **Test the published package**

## 📁 Project Structure

```
vercel-tenant-plugin/
├── src/                    # Source code
│   ├── collections/        # Payload collections
│   ├── components/         # React components
│   ├── endpoints/          # API endpoints
│   ├── hooks/             # Payload hooks
│   ├── middleware/        # Middleware functions
│   ├── types/             # TypeScript types
│   └── utils/             # Utility functions
├── dev/                   # Development environment
│   ├── payload.config.ts  # Payload config for testing
│   ├── dashboard/         # Custom dashboard components
│   └── helpers/           # Development helpers
├── dist/                  # Built files (auto-generated)
└── package.json           # Package configuration
```

## 🛠️ Available Scripts

| Script             | Description                         |
| ------------------ | ----------------------------------- |
| `pnpm dev:plugin`  | Start development with auto-rebuild |
| `pnpm dev`         | Start Payload dev server only       |
| `pnpm build`       | Build the plugin                    |
| `pnpm build:watch` | Build with file watching            |
| `pnpm test`        | Run tests                           |
| `pnpm lint`        | Run ESLint                          |
| `pnpm clean`       | Clean build files                   |

## 🔄 Switching Between Local and Published

### **Use Local Source (Development)**

```typescript
// dev/payload.config.ts
import { vercelTenantPlugin } from '../src/index'
```

### **Use Published Package (Testing)**

```typescript
// dev/payload.config.ts
import { vercelTenantPlugin } from '@midblck/vercel-tenant-plugin'
```

## 🧪 Testing

### **Integration Tests**

```bash
pnpm test:int
```

### **End-to-End Tests**

```bash
pnpm test:e2e
```

### **All Tests**

```bash
pnpm test
```

## 📦 Publishing

### **Build and Publish**

```bash
# 1. Build the plugin
pnpm build

# 2. Run tests
pnpm test

# 3. Commit changes
git add .
git commit -m "Your changes"

# 4. Bump version
npm version patch  # or minor/major

# 5. Publish
npm publish --access public
```

### **Pre-publish Checklist**

- [ ] All tests pass
- [ ] Build succeeds without errors
- [ ] Version bumped appropriately
- [ ] Changes committed to git
- [ ] README updated if needed

## 🐛 Debugging

### **Enable Debug Mode**

```typescript
// dev/payload.config.ts
const config = buildConfig({
  debug: true, // Enable debug logging
  // ... rest of config
})
```

### **Check Build Output**

```bash
# Verify dist folder contents
ls -la dist/

# Check if main entry point exists
ls -la dist/index.js
```

### **Common Issues**

1. **Import errors**: Make sure you're using the correct import path
2. **Build errors**: Check TypeScript errors with `pnpm build:types`
3. **Component not found**: Verify the component is exported in the correct file

## 🔗 Useful Links

- [Payload CMS Documentation](https://payloadcms.com/docs)
- [Vercel API Documentation](https://vercel.com/docs/rest-api)
- [Plugin Development Guide](https://payloadcms.com/docs/plugins/overview)

## 💡 Tips

1. **Use `pnpm dev:plugin`** for the best development experience
2. **Test with published package** before releasing
3. **Keep the dev environment simple** - focus on plugin functionality
4. **Use TypeScript** for better development experience
5. **Write tests** for new features
