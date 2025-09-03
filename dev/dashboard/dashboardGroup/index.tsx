import './index.scss'

import type { I18nClient } from '@payloadcms/translations'
import { getTranslation } from '@payloadcms/translations'
import { Card } from '@payloadcms/ui'
import { EntityType, formatAdminURL } from '@payloadcms/ui/shared'
import Link from 'next/link'
import type { BasePayload, CollectionSlug, StaticLabel } from 'payload'
import type { FC } from 'react'

import { groups } from '../../lib/groups'

import { FeatureCard } from '../dashboardFeatureCard'

type Props = {
  adminRoute: string
  entities: {
    label: StaticLabel
    slug: string
    type: EntityType
  }[]
  i18n: I18nClient
  label: string
  payload: BasePayload
}

export const DashboardGroup: FC<Props> = async ({
  adminRoute,
  entities,
  i18n,
  label: groupLabel,
  payload,
}) => {
  const getCounts = async () => {
    const docCounts: Record<string, number> = {}
    for (let i = 0; i < entities.length; i++) {
      const slug = entities[i].slug as CollectionSlug
      const { totalDocs } = await payload.count({ collection: slug })
      docCounts[slug] = totalDocs
    }
    return docCounts
  }

  const isContentGroup = groupLabel === groups.content.en || groupLabel === groups.content.id
  let counts: Record<string, number>

  if (isContentGroup) {
    counts = await getCounts()
  }

  return (
    <div className="dashboard__group">
      <p className="dashboard__label">{groupLabel}</p>
      <ul className="dashboard__card-list">
        {entities.map(({ slug, type, label }, entityIndex) => (
          <li key={entityIndex}>
            {isContentGroup ? (
              <FeatureCard
                count={counts[slug] ?? 0}
                href={formatAdminURL({
                  adminRoute,
                  path:
                    type === EntityType.collection ? `/collections/${slug}` : `/globals/${slug}`,
                })}
                Link={Link}
                title={getTranslation(label, i18n)}
              />
            ) : (
              <Card
                href={formatAdminURL({
                  adminRoute,
                  path:
                    type === EntityType.collection ? `/collections/${slug}` : `/globals/${slug}`,
                })}
                Link={Link}
                title={getTranslation(label, i18n)}
              />
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
