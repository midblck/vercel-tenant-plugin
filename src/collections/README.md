# Collections Organization

This directory contains the organized collection definitions for the Vercel Tenant Plugin.

## Structure

- `tenant.ts` - Main tenant collection configuration
- `tenantFields.ts` - Tenant collection field definitions
- `tenantEnvironmentVariable.ts` - Environment variable collection configuration
- `index.ts` - Re-exports for clean imports

## Benefits of This Organization

1. **Separation of Concerns**: Each file has a single responsibility
2. **Maintainability**: Easier to find and modify specific parts
3. **Readability**: Smaller, focused files are easier to understand
4. **Reusability**: Fields and hooks can be imported and reused
5. **Testing**: Individual components can be tested in isolation

## Usage

```typescript
// Import collections
import { tenantCollection, tenantEnvironmentVariableCollection } from './collections'

// Import individual components if needed
import { tenantFields } from './collections/tenantFields'
import { tenantAfterChangeHook } from '../hooks/tenantHooks'
```

## Hooks

Hooks are organized in the `../hooks/` directory:

- `tenantHooks.ts` - Contains all tenant collection hooks
- `deploymentHooks.ts` - Contains all deployment-related hooks
- `envvarsHooks.ts` - Contains environment variables hooks
- Each hook is exported individually for better tree-shaking
