'use client'

import React, { useEffect, useState } from 'react'
import styles from './TenantSyncSection.module.css'

interface TenantData {
  id: string
  vercelProjectId?: string
}

interface TenantSyncSectionProps {
  tenant?: TenantData
}

/**
 * Simple Sync Button Component
 *
 * Just gets project ID and shows a sync button
 */
export const TenantSyncSection: React.FC<TenantSyncSectionProps> = ({ tenant: propTenant }) => {
  const [tenant, setTenant] = useState<null | TenantData>(propTenant || null)
  const [loading, setLoading] = useState(!propTenant)
  const [error, setError] = useState<null | string>(null)
  const [mounted, setMounted] = useState(false)

  // Ensure component is mounted
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) {
      return
    }

    const timer = setTimeout(() => {
      const getTenantData = async () => {
        if (propTenant) {
          setTenant(propTenant)
          setLoading(false)
          return
        }

        try {
          const pathname = window.location.pathname
          const match = pathname.match(/\/collections\/tenant\/([^/]+)/)

          if (!match) {
            setError('No tenant ID found')
            setLoading(false)
            return
          }

          const tenantId = match[1]

          const response = await fetch(`/api/tenant/${tenantId}?depth=2`)

          if (!response.ok) {
            throw new Error(`Failed to fetch tenant: ${response.statusText}`)
          }

          const tenantData = await response.json()
          setTenant(tenantData)
          setError(null)
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to fetch tenant data')
        } finally {
          setLoading(false)
        }
      }

      void getTenantData()
    }, 0)

    return () => clearTimeout(timer)
  }, [propTenant, mounted])

  const handleSync = async () => {
    if (!tenant?.vercelProjectId) {
      alert('No Vercel project ID found')
      return
    }

    try {
      const response = await fetch(`/api/sync-single-project?projectId=${tenant.vercelProjectId}`, {
        body: JSON.stringify({ projectId: tenant.vercelProjectId }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })

      const result = await response.json()

      if (response.ok && result.success) {
        alert('✅ Sync completed successfully')
        window.location.reload()
      } else {
        alert(`❌ Sync failed: ${result.error || 'Unknown error'}`)
      }
    } catch (error) {
      alert(`❌ Sync error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  if (loading) {
    return <div>Loading...</div>
  }

  if (error || !tenant) {
    return <div>Error: {error || 'No tenant data'}</div>
  }

  if (!tenant.vercelProjectId) {
    return <div>No Vercel project ID - cannot sync</div>
  }

  return (
    <div className={styles.simpleSyncSection}>
      <div className={styles.syncContent}>
        <div className={styles.syncDescription}>
          <h3>Sync Data</h3>
          <p>
            *Sync your Vercel project data before creating environment variables and deployment.
            This ensures all project information is up-to-date in the system.
          </p>
        </div>
        <button className={styles.syncButton} disabled={loading} onClick={handleSync} type="button">
          {loading ? '🔄 Syncing...' : '🔄 Sync Data'}
        </button>
      </div>
    </div>
  )
}
