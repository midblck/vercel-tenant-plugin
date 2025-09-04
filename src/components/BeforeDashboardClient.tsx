'use client'
import { Button, useConfig } from '@payloadcms/ui'
import { useCallback, useEffect, useState } from 'react'

import styles from './BeforeDashboardClient.module.css'
import {
  AUTO_REFRESH_DELAY,
  ERROR_MESSAGES,
  PROGRESS_COLORS,
  PROGRESS_MESSAGES,
  SYNC_STATUSES,
} from '../utils/constants'
import { logger } from '../utils/logger'

export const BeforeDashboardClient = () => {
  const { config } = useConfig()

  // Extract config values to avoid context access in callbacks
  const serverURL = config.serverURL
  const routesAPI = config.routes.api
  const routesAdmin = config.routes.admin

  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [_syncResult, setSyncResult] = useState<null | Record<string, unknown>>(null)
  const [_deploymentMessage, _setDeploymentMessage] = useState('')
  const [_isDeploymentLoading, _setIsDeploymentLoading] = useState(false)
  const [cancelMessage, setCancelMessage] = useState('')
  const [isCancelLoading, setIsCancelLoading] = useState(false)
  const [syncDeploymentMessage, setSyncDeploymentMessage] = useState('')
  const [isSyncDeploymentLoading, setIsSyncDeploymentLoading] = useState(false)
  const [vercelApiStatus, setVercelApiStatus] = useState<'checking' | 'offline' | 'online'>(
    'checking',
  )

  // Enhanced progress tracking
  const [syncProgress, setSyncProgress] = useState({
    current: 0,
    message: '',
    status: SYNC_STATUSES.IDLE as string,
    total: 0,
  })
  const [deploymentProgress, setDeploymentProgress] = useState({
    current: 0,
    message: '',
    status: SYNC_STATUSES.IDLE as string,
    total: 0,
  })

  // Tenant status state
  const [tenantCounts, setTenantCounts] = useState({
    approved: 0,
    draft: 0,
    total: 0,
  })

  // Tenant deployment status state
  const [deploymentCounts, setDeploymentCounts] = useState({
    building: 0,
    error: 0,
    ready: 0,
    total: 0,
  })

  // Function to fetch all counts in a single call
  const fetchAllCounts = useCallback(async () => {
    try {
      // Fetch both tenant and deployment counts in parallel
      const [tenantResponse, deploymentResponse] = await Promise.all([
        fetch(`${serverURL}${routesAPI}/vercel/tenant-counts`, {
          headers: {
            'Content-Type': 'application/json',
          },
          method: 'GET',
        }),
        fetch(`${serverURL}${routesAPI}/vercel/tenant-deployment-counts`, {
          headers: {
            'Content-Type': 'application/json',
          },
          method: 'GET',
        }),
      ])

      // Update tenant counts
      if (tenantResponse.ok) {
        const tenantData = await tenantResponse.json()
        setTenantCounts({
          approved: tenantData.approved || 0,
          draft: tenantData.draft || 0,
          total: tenantData.total || 0,
        })
      }

      // Update deployment counts
      if (deploymentResponse.ok) {
        const deploymentData = await deploymentResponse.json()
        setDeploymentCounts({
          building: deploymentData.building || 0,
          error: deploymentData.error || 0,
          ready: deploymentData.ready || 0,
          total: deploymentData.total || 0,
        })
      }
    } catch (error) {
      void logger.error('Error fetching counts', {
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }, [serverURL, routesAPI])

  // Fetch all counts on component mount only
  useEffect(() => {
    void fetchAllCounts()
  }, [fetchAllCounts])

  // Check Vercel API status on component mount
  const checkVercelApiStatus = useCallback(async () => {
    setVercelApiStatus('checking')
    try {
      const response = await fetch(`${serverURL}${routesAPI}/vercel/projects`, {
        body: JSON.stringify({}),
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
      })

      if (response.ok) {
        setVercelApiStatus('online')
      } else {
        setVercelApiStatus('offline')
      }
    } catch (_error) {
      setVercelApiStatus('offline')
    }
  }, [serverURL, routesAPI])

  // Check status on mount
  useEffect(() => {
    void checkVercelApiStatus()
  }, [checkVercelApiStatus])

  const handleSync = useCallback(async () => {
    setIsLoading(true)
    setMessage(PROGRESS_MESSAGES.SYNCING_PROJECTS)
    setSyncProgress({
      current: 0,
      message: PROGRESS_MESSAGES.STARTING_SYNC,
      status: SYNC_STATUSES.SYNCING,
      total: 0,
    })

    try {
      const requestBody = { syncAll: true }
      void logger.info('Sync Projects Request', {
        body: requestBody,
        url: `${serverURL}${routesAPI}/vercel/sync`,
      })

      const response = await fetch(`${serverURL}${routesAPI}/vercel/sync`, {
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
      })

      void logger.info('Sync Projects Response', {
        ok: response.ok,
        status: response.status,
      })

      if (response.ok) {
        const result = await response.json()
        void logger.info('Sync Projects Success', result)
        setSyncResult(result)

        // Update progress with result data
        if (result.progress) {
          setSyncProgress({
            current: result.progress.current,
            message: '', // Clear progress message to avoid redundancy
            status: SYNC_STATUSES.COMPLETED,
            total: result.progress.total,
          })
        }

        // Show single, combined success message
        if (result.summary) {
          const { errors, synced, updated } = result.summary
          setMessage(
            `✅ Sync completed: ${synced} new tenants, ${updated} updated${errors > 0 ? `, ${errors} errors` : ''}`,
          )
        } else {
          setMessage(`✅ Successfully synced ${result.total} projects`)
        }

        // Refresh all counts after successful sync
        void fetchAllCounts()

        // Auto-refresh after successful sync
        setTimeout(() => {
          window.location.reload()
        }, AUTO_REFRESH_DELAY)
      } else {
        const errorData = await response.json()
        void logger.error('Sync Projects Error', errorData)
        let errorMessage = errorData.error || 'Failed to sync projects'

        // Check for specific error types
        if (errorMessage.includes('Missing tenantId or syncAll parameter')) {
          errorMessage = ERROR_MESSAGES.MISSING_PARAMS
        }

        setMessage(`❌ Error: ${errorMessage}`)
        setSyncProgress({
          current: 0,
          message: 'Sync failed',
          status: SYNC_STATUSES.ERROR,
          total: 0,
        })
      }
    } catch (error) {
      void logger.error('Sync Projects Exception', {
        error: error instanceof Error ? error.message : String(error),
      })
      // Enhanced error handling with user-friendly messages
      let errorMessage: string = ERROR_MESSAGES.CONNECTION_FAILED

      if (error instanceof TypeError && error.message.includes('fetch')) {
        errorMessage = ERROR_MESSAGES.NETWORK_ERROR
      } else if (error instanceof Error) {
        errorMessage = error.message
      }

      setMessage(`❌ Error: ${errorMessage}`)
      setSyncProgress({
        current: 0,
        message: 'Sync failed',
        status: SYNC_STATUSES.ERROR,
        total: 0,
      })
    } finally {
      setIsLoading(false)
    }
  }, [serverURL, routesAPI, fetchAllCounts])

  const handleSyncDeployments = useCallback(async () => {
    setIsSyncDeploymentLoading(true)
    setSyncDeploymentMessage(PROGRESS_MESSAGES.SYNCING_DEPLOYMENTS)
    setDeploymentProgress({
      current: 0,
      message: PROGRESS_MESSAGES.STARTING_DEPLOYMENT_SYNC,
      status: SYNC_STATUSES.SYNCING,
      total: 0,
    })

    try {
      const requestBody = { syncAll: true }
      const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || serverURL

      void logger.info('Sync Deployments Request', {
        body: requestBody,
        url: `${serverUrl}${routesAPI}/vercel/sync-deployments`,
      })

      const response = await fetch(`${serverUrl}${routesAPI}/vercel/sync-deployments`, {
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
      })

      void logger.info('Sync Deployments Response', {
        ok: response.ok,
        status: response.status,
      })

      if (response.ok) {
        const result = await response.json()
        void logger.info('Sync Deployments Success', result)

        // Update progress with result data
        if (result.progress) {
          setDeploymentProgress({
            current: result.progress.current,
            message: '', // Clear progress message to avoid redundancy
            status: SYNC_STATUSES.COMPLETED,
            total: result.progress.total,
          })
        }

        // Show detailed success message from API response
        if (result.message) {
          setSyncDeploymentMessage(result.message)
        } else if (result.summary) {
          const {
            connectedTenants,
            deletedRecords,
            envVarSync,
            newDeployments,
            updatedDeployments,
          } = result.summary

          let message = `✅ Deployment sync completed: ${newDeployments} new, ${updatedDeployments} updated, ${deletedRecords} deleted, ${connectedTenants} connected`

          // Add environment variable sync results if available
          if (envVarSync) {
            message += ` | Env Vars: ${envVarSync.newEnvVars} new, ${envVarSync.updatedEnvVars} updated, ${envVarSync.skippedEnvVars} skipped`
          }

          setSyncDeploymentMessage(message)
        } else {
          setSyncDeploymentMessage(`✅ Deployment sync completed successfully`)
        }

        // Refresh all counts after successful sync
        void fetchAllCounts()

        // Auto-refresh after successful sync
        setTimeout(() => {
          window.location.reload()
        }, AUTO_REFRESH_DELAY)
      } else {
        const errorData = await response.json()
        void logger.error('Sync Deployments Error', errorData)
        let errorMessage = errorData.error || 'Failed to sync deployments'

        // Check for specific error types
        if (errorMessage.includes('Missing tenantId or syncAll parameter')) {
          errorMessage = ERROR_MESSAGES.MISSING_PARAMS
        }

        setSyncDeploymentMessage(`❌ Error: ${errorMessage}`)
        setDeploymentProgress({
          current: 0,
          message: 'Deployment sync failed',
          status: SYNC_STATUSES.ERROR,
          total: 0,
        })
      }
    } catch (error) {
      void logger.error('Sync Deployments Exception', {
        error: error instanceof Error ? error.message : String(error),
      })
      setSyncDeploymentMessage(`❌ Error: ${ERROR_MESSAGES.CONNECTION_FAILED}`)
      setDeploymentProgress({
        current: 0,
        message: 'Deployment sync failed',
        status: SYNC_STATUSES.ERROR,
        total: 0,
      })
    } finally {
      setIsSyncDeploymentLoading(false)
    }
  }, [serverURL, routesAPI, fetchAllCounts])

  const handleCreateDeployment = useCallback(() => {
    // Redirect to tenant-deployment create page
    window.location.href = `${routesAdmin}/collections/tenant-deployment/create`
  }, [routesAdmin])

  const handleCancelDeployments = useCallback(async () => {
    setIsCancelLoading(true)
    setCancelMessage(PROGRESS_MESSAGES.CANCELLING_DEPLOYMENTS)

    try {
      const response = await fetch(`${serverURL}${routesAPI}/vercel/cancel-deployments`, {
        method: 'POST',
      })

      if (response.ok) {
        const _result = await response.json()
        setCancelMessage(`✅ Deployments cancelled successfully`)

        // Refresh all counts after successful cancellation
        void fetchAllCounts()

        // Auto-refresh after successful cancellation
        setTimeout(() => {
          window.location.reload()
        }, AUTO_REFRESH_DELAY)
      } else {
        const errorData = await response.json()
        setCancelMessage(`❌ Error: ${errorData.error || 'Failed to cancel deployments'}`)
      }
    } catch (_error) {
      setCancelMessage(`❌ Error: ${ERROR_MESSAGES.CONNECTION_FAILED}`)
    } finally {
      setIsCancelLoading(false)
    }
  }, [serverURL, routesAPI, fetchAllCounts])

  const getProgressBarColor = (status: string) => {
    return PROGRESS_COLORS[status as keyof typeof PROGRESS_COLORS] || PROGRESS_COLORS.IDLE
  }

  const getProgressPercentage = (current: number, total: number) => {
    if (total === 0) {
      return 0
    }
    return Math.min((current / total) * 100, 100)
  }

  const getVercelApiStatusColor = () => {
    switch (vercelApiStatus) {
      case 'checking':
        return 'var(--color-warning-500)'
      case 'offline':
        return 'var(--color-error-500)'
      case 'online':
        return 'var(--color-success-500)'
      default:
        return 'var(--color-base-500)'
    }
  }

  const getVercelApiStatusText = () => {
    switch (vercelApiStatus) {
      case 'checking':
        return 'Checking...'
      case 'offline':
        return 'Offline'
      case 'online':
        return 'Online'
      default:
        return 'Unknown'
    }
  }

  return (
    <div className={styles['before-dashboard-container']}>
      <div className={styles.wrapper}>
        {/* Header Section */}
        <div className={styles.header}>
          <h2 className={styles.title}>Vercel Project Plugin</h2>
          <p className={styles.subtitle}>
            Manage vercel projects (Tenant), deployments, and configurations
          </p>
        </div>

        {/* Combined Dashboard Section */}
        <div className={styles.combinedDashboard}>
          <h3 className={styles.dashboardTitle}>Vercel Operations</h3>
          <div className={styles.combinedGrid}>
            {/* Status Cards Row */}
            <div className={styles.statusRow}>
              {/* Vercel API Status Card */}
              <div className={`${styles.statusCard} ${styles.apiStatus}`}>
                <div className={styles.statusNumber}>
                  <span
                    className={styles.statusDot}
                    style={{ backgroundColor: getVercelApiStatusColor() }}
                  ></span>
                </div>
                <div className={styles.statusLabel}>API Status</div>
                <div className={styles.statusDetails}>
                  <div className={styles.statusDetail}>{getVercelApiStatusText()}</div>
                  <button
                    className={styles.refreshButton}
                    onClick={() => void checkVercelApiStatus()}
                    type="button"
                  >
                    Refresh
                  </button>
                </div>
              </div>

              {/* Tenants Card */}
              <div className={styles.statusCard}>
                <div className={styles.statusNumber}>{tenantCounts.total}</div>
                <div className={styles.statusLabel}>Tenants</div>
                <div className={styles.statusDetails}>
                  <div className={styles.statusDetail}>
                    <span
                      className={styles.statusDot}
                      style={{ backgroundColor: 'var(--color-success-500)' }}
                    ></span>
                    {tenantCounts.approved} Approved
                  </div>
                  <div className={styles.statusDetail}>
                    <span
                      className={styles.statusDot}
                      style={{ backgroundColor: 'var(--color-warning-500)' }}
                    ></span>
                    {tenantCounts.draft} Draft
                  </div>
                </div>
              </div>

              {/* Deployments Card */}
              <div className={styles.statusCard}>
                <div className={styles.statusNumber}>{deploymentCounts.total}</div>
                <div className={styles.statusLabel}>Deployments</div>
                <div className={styles.statusDetails}>
                  <div className={styles.statusDetail}>
                    <span
                      className={styles.statusDot}
                      style={{ backgroundColor: 'var(--color-success-500)' }}
                    ></span>
                    {deploymentCounts.ready} Ready
                  </div>
                  <div className={styles.statusDetail}>
                    <span
                      className={styles.statusDot}
                      style={{ backgroundColor: 'var(--color-blue-500)' }}
                    ></span>
                    {deploymentCounts.building} Building
                  </div>
                  {deploymentCounts.error > 0 && (
                    <div className={styles.statusDetail}>
                      <span
                        className={styles.statusDot}
                        style={{ backgroundColor: 'var(--color-error-500)' }}
                      ></span>
                      {deploymentCounts.error} Error
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Cards Row */}
            <div className={styles.actionRow}>
              <div className={styles.actionsGrid}>
                {/* Sync Projects Section */}
                <div className={styles.actionCard}>
                  <div className={styles.actionHeader}>
                    <div className={styles.actionIcon}>
                      <span aria-label="Sync" role="img">
                        🔄
                      </span>
                    </div>
                    <div className={styles.actionInfo}>
                      <h3 className={styles.actionTitle}>Sync Projects</h3>
                      <p className={styles.actionDescription}>
                        Sync your Vercel projects with the tenant system
                      </p>
                    </div>
                  </div>

                  <div className={styles.actionContent}>
                    <Button
                      className={styles.actionButton}
                      disabled={isLoading}
                      onClick={handleSync}
                    >
                      {isLoading ? 'Syncing...' : 'Sync Now'}
                    </Button>

                    {syncProgress.status === SYNC_STATUSES.SYNCING && (
                      <div className={styles.progressSection}>
                        <div className={styles.progressBar}>
                          <div
                            className={styles.progressFill}
                            style={{
                              backgroundColor: getProgressBarColor(syncProgress.status),
                              width: `${getProgressPercentage(syncProgress.current, syncProgress.total)}%`,
                            }}
                          />
                        </div>
                        <p className={styles.progressText}>
                          {syncProgress.message || `${syncProgress.current}/${syncProgress.total}`}
                        </p>
                      </div>
                    )}

                    {message && (
                      <div
                        className={`${styles.message} ${syncProgress.status === 'success' ? styles['message--success'] : syncProgress.status === 'error' ? styles['message--error'] : ''}`}
                      >
                        {message}
                      </div>
                    )}
                  </div>
                </div>

                {/* Sync Deployments Section */}
                <div className={styles.actionCard}>
                  <div className={styles.actionHeader}>
                    <div className={styles.actionIcon}>
                      <span aria-label="Sync Deployments" role="img">
                        🔄
                      </span>
                    </div>
                    <div className={styles.actionInfo}>
                      <h3 className={styles.actionTitle}>Sync Deployments</h3>
                      <p className={styles.actionDescription}>
                        Sync deployment data and environment variables from Vercel
                      </p>
                    </div>
                  </div>

                  <div className={styles.actionContent}>
                    <Button
                      className={styles.actionButton}
                      disabled={isSyncDeploymentLoading}
                      onClick={handleSyncDeployments}
                    >
                      {isSyncDeploymentLoading ? 'Syncing...' : 'Sync Deployments'}
                    </Button>

                    {deploymentProgress.status !== SYNC_STATUSES.IDLE && (
                      <div className={styles.progressSection}>
                        <div className={styles.progressBar}>
                          <div
                            className={styles.progressFill}
                            style={{
                              backgroundColor: getProgressBarColor(deploymentProgress.status),
                              width: `${getProgressPercentage(deploymentProgress.current, deploymentProgress.total)}%`,
                            }}
                          />
                        </div>
                        <p className={styles.progressText}>
                          {deploymentProgress.message ||
                            `${deploymentProgress.current}/${deploymentProgress.total}`}
                        </p>
                      </div>
                    )}

                    {syncDeploymentMessage && (
                      <div
                        className={`${styles.message} ${deploymentProgress.status === 'success' ? styles['message--success'] : deploymentProgress.status === 'error' ? styles['message--error'] : ''}`}
                      >
                        {syncDeploymentMessage}
                      </div>
                    )}
                  </div>
                </div>

                {/* Create Deployment Section */}
                <div className={styles.actionCard}>
                  <div className={styles.actionHeader}>
                    <div className={styles.actionIcon}>
                      <span aria-label="Rocket" role="img">
                        🚀
                      </span>
                    </div>
                    <div className={styles.actionInfo}>
                      <h3 className={styles.actionTitle}>Create Deployment</h3>
                      <p className={styles.actionDescription}>Create a new tenant deployment</p>
                    </div>
                  </div>

                  <div className={styles.actionContent}>
                    <Button className={styles.actionButton} onClick={handleCreateDeployment}>
                      Create Deployment
                    </Button>
                    <p className={styles.redirectNote}>
                      Redirects to tenant-deployment create form
                    </p>
                  </div>
                </div>

                {/* Cancel Deployments Section */}
                <div className={styles.actionCard}>
                  <div className={styles.actionHeader}>
                    <div className={styles.actionIcon}>
                      <span aria-label="Stop" role="img">
                        ⏹️
                      </span>
                    </div>
                    <div className={styles.actionInfo}>
                      <h3 className={styles.actionTitle}>Cancel Deployments</h3>
                      <p className={styles.actionDescription}>
                        Cancel any running or pending deployments
                      </p>
                    </div>
                  </div>

                  <div className={styles.actionContent}>
                    <Button
                      buttonStyle="secondary"
                      className={styles.actionButton}
                      disabled={isCancelLoading}
                      onClick={handleCancelDeployments}
                    >
                      {isCancelLoading ? 'Cancelling...' : 'Cancel All'}
                    </Button>

                    {cancelMessage && (
                      <div
                        className={`${styles.message} ${
                          cancelMessage.includes('✅')
                            ? styles['message--completed']
                            : styles['message--error']
                        }`}
                      >
                        {cancelMessage}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
