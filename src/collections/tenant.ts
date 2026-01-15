import type { CollectionConfig } from 'payload'

import {
  afterChangeCronHook,
  beforeChangeCronHook,
  dashboardDeleteHook,
  dashboardRefreshHook,
  syncTenantToVercelHook,
  tenantAfterChangeHook,
  tenantAfterDeleteHook,
  tenantBeforeChangeHook,
  tenantBeforeDeleteHook,
  tenantBeforeValidateHook,
  updateProjectUrlHook,
} from '../hooks/tenantHooks'
import { tenantFields } from './tenantFields'

import { groups } from './groups'

export const tenantCollection: CollectionConfig = {
  slug: 'tenant',
  admin: {
    defaultColumns: [
      'name',
      'vercelProjectGitRepository',
      'vercelProjectUrl',
      'isActive',
      'status',
      'lastDeploymentStatus',
      'disableCron',
      'latestDeployment',
    ],
    description: 'Vercel project tenants with comprehensive project data',
    group: groups.tenant,
    useAsTitle: 'name',
  },
  fields: tenantFields,
  hooks: {
    afterChange: [
      tenantAfterChangeHook,
      afterChangeCronHook,
      syncTenantToVercelHook,
      dashboardRefreshHook,
    ],
    afterDelete: [tenantAfterDeleteHook, dashboardDeleteHook],
    beforeChange: [updateProjectUrlHook, tenantBeforeChangeHook, beforeChangeCronHook],
    beforeDelete: [tenantBeforeDeleteHook],
    beforeValidate: [tenantBeforeValidateHook],
  },
}
