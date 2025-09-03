import { type groupNavItems } from '@payloadcms/ui/shared'
import type { ServerProps } from 'payload'
import type { FC } from 'react'
import { Fragment } from 'react'

import { groups } from '../lib/groups'
import { DashboardBanner } from './dashboardBanner'
import { DashboardGroup } from './dashboardGroup'

// Import the beforeDashboard components from the plugin
import { BeforeDashboardClient } from 'vercel-tenant-plugin/client'

type DashboardProps = {
  navGroups: ReturnType<typeof groupNavItems>
} & ServerProps

export const Dashboard: FC<DashboardProps> = (props) => {
  const {
    i18n,
    navGroups,
    payload,
    payload: {
      config: {
        routes: { admin: adminRoute },
      },
    },
  } = props

  // Sort navGroups based on groups order
  const sortedNavGroups = [...navGroups].sort((a, b) => {
    const groupOrder = ['content', 'configuration', 'users', 'misc', 'collections']
    const aIndex = groupOrder.findIndex(
      (group) =>
        a.label === groups[group as keyof typeof groups]?.en ||
        a.label === groups[group as keyof typeof groups]?.id,
    )
    const bIndex = groupOrder.findIndex(
      (group) =>
        b.label === groups[group as keyof typeof groups]?.en ||
        b.label === groups[group as keyof typeof groups]?.id,
    )
    return aIndex - bIndex
  })

  return (
    <Fragment>
      {/* Render the dashboard banner first */}
      <DashboardBanner />

      {/* Render the beforeDashboard components from the plugin in a styled container */}
      <div className="before-dashboard-container">
        <BeforeDashboardClient />
      </div>

      {/* Render the custom dashboard content */}
      <div className="dashboard">
        <div className="dashboard__wrap">
          {sortedNavGroups.map(({ entities, label }, entityIndex) => (
            <DashboardGroup
              adminRoute={adminRoute}
              entities={entities}
              i18n={i18n}
              key={entityIndex}
              label={label}
              payload={payload}
            />
          ))}
        </div>
      </div>
    </Fragment>
  )
}
