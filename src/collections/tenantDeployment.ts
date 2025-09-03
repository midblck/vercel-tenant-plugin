import type { CollectionConfig } from 'payload'

import {
  dashboardDeploymentDeleteHook,
  dashboardDeploymentRefreshHook,
  deploymentDeleteHook,
  deploymentTriggerHook,
} from '../hooks/deploymentHooks'

import { groups } from './groups'

// Tenant deployment collection for tracking Vercel deployments
export const tenantDeployment: CollectionConfig = {
  slug: 'tenant-deployment',
  access: {
    create: () => true,
    delete: () => true,
    read: () => true,
    update: () => true,
  },
  admin: {
    defaultColumns: ['deploymentId', 'tenant', 'status', 'deploymentCreatedAt', 'lastSynced'],
    group: groups.tenant,
    useAsTitle: 'deploymentId',
  },
  fields: [
    {
      name: 'tenant',
      type: 'relationship',
      hasMany: false,
      relationTo: 'tenant',
      required: true,
    },
    {
      name: 'triggerType',
      type: 'select',
      defaultValue: 'manual',
      options: [
        { label: 'Manual', value: 'manual' },
        { label: 'Sync', value: 'sync' },
        { label: 'Auto', value: 'auto' },
      ],
    },
    {
      name: 'deploymentId',
      type: 'text',
    },
    {
      name: 'deploymentUrl',
      type: 'text',
      required: false,
    },
    {
      name: 'buildId',
      type: 'text',
      required: false,
    },
    {
      name: 'deploymentCreatedAt',
      type: 'date',
      admin: {
        description: 'When this deployment was created on Vercel',
      },
      required: false,
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'queued',
      options: [
        { label: 'Building', value: 'building' },
        { label: 'Ready', value: 'ready' },
        { label: 'Error', value: 'error' },
        { label: 'Canceled', value: 'canceled' },
        { label: 'Queued', value: 'queued' },
      ],
    },
    {
      name: 'environment',
      type: 'select',
      defaultValue: 'production',
      options: [
        { label: 'Production', value: 'production' },
        { label: 'Preview', value: 'preview' },
        { label: 'Development', value: 'development' },
      ],
      required: true,
    },
    {
      name: 'events',
      type: 'array',
      fields: [
        {
          name: 'type',
          type: 'text',
          required: true,
        },
        {
          name: 'created',
          type: 'date',
          required: true,
        },
        {
          name: 'text',
          type: 'text',
          required: false,
        },
        {
          name: 'statusCode',
          type: 'number',
          required: false,
        },
        {
          name: 'payload',
          type: 'json',
          required: false,
        },
      ],
    },
    {
      name: 'lastSynced',
      type: 'date',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'lastSyncStatus',
      type: 'select',
      admin: {
        description: 'Last sync operation status',
        position: 'sidebar',
      },
      defaultValue: 'synced',
      options: [
        { label: 'Synced', value: 'synced' },
        { label: 'Error', value: 'error' },
      ],
    },
    {
      name: 'lastSyncMessage',
      type: 'text',
      admin: {
        description: 'Last sync operation message',
        position: 'sidebar',
        readOnly: true,
      },
    },
    {
      name: 'lastSyncData',
      type: 'json',
      admin: {
        description: 'Last sync operation data from Vercel for recheck',
        position: 'sidebar',
        readOnly: true,
      },
    },
    {
      name: 'meta',
      type: 'json',
      admin: {
        description: 'Additional deployment metadata (source, trigger type, etc.)',
      },
    },
    {
      name: 'createdAt',
      type: 'date',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'updatedAt',
      type: 'date',
      admin: {
        readOnly: true,
      },
    },
  ],
  hooks: {
    afterChange: [deploymentTriggerHook, dashboardDeploymentRefreshHook],
    afterDelete: [dashboardDeploymentDeleteHook],
    beforeDelete: [deploymentDeleteHook],
  },
  timestamps: true,
}
