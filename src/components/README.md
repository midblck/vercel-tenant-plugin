# Vercel Tenant Plugin Components

## Components Overview

### 1. BeforeDashboardClient

Main dashboard component for the admin interface that provides:

- System overview with tenant and deployment statistics
- Operations center for syncing projects and deployments
- Vercel API status monitoring

### 2. SyncButton

Individual sync button component that can be used anywhere in the admin interface.

**Props:**

```tsx
interface SyncButtonProps {
  tenant: {
    id: string
    lastSynced?: string
    lastSyncStatus?: string
    name: string
    vercelProjectId?: string
  }
}
```

**Usage:**

```tsx
import { SyncButton } from 'vercel-tenant-plugin/client'
;<SyncButton tenant={tenantData} />
```

### 3. TenantSyncSection

Clean sync section component that displays tenant information and sync controls.

**Props:**

```tsx
interface TenantSyncSectionProps {
  tenant?: {
    id: string
    lastSynced?: string
    lastSyncStatus?: string
    name: string
    vercelProjectId?: string
  }
}
```

**Usage:**

```tsx
import { TenantSyncSection } from 'vercel-tenant-plugin/client'

// As a UI field (recommended) - automatically gets tenant data
<TenantSyncSection />

// With explicit tenant data
<TenantSyncSection tenant={tenantData} />
```

## Integration Examples

### In Tenant Document View

```tsx
// In your tenant edit/create form
import { TenantSyncSection } from 'vercel-tenant-plugin/client'

export const TenantForm = ({ tenant }) => {
  return (
    <div>
      {/* Your existing tenant form fields */}

      {/* Add the sync section */}
      <TenantSyncSection tenant={tenant} />
    </div>
  )
}
```

### In Custom Dashboard

```tsx
// In a custom dashboard component
import { SyncButton } from 'vercel-tenant-plugin/client'

export const TenantList = ({ tenants }) => {
  return (
    <div>
      {tenants.map((tenant) => (
        <div key={tenant.id}>
          <h3>{tenant.name}</h3>
          <SyncButton tenant={tenant} />
        </div>
      ))}
    </div>
  )
}
```

## Migration from UI Field

The `syncButton` UI field has been removed from `tenantFields.ts` and replaced with the `TenantSyncSection` component. This provides:

- ✅ **Clean Data Access**: Uses Payload's built-in admin API
- ✅ **No Field Context Issues**: Reliable data fetching without complex context
- ✅ **Built-in Power**: Leverages Payload's existing admin infrastructure
- ✅ **Better UX**: Displays comprehensive tenant sync information

## Styling

All components use CSS modules and follow Payload's design system:

- Responsive design with mobile breakpoints
- Consistent spacing and typography
- Theme-aware colors using CSS variables
- Hover effects and smooth transitions
