import type {SiteAEditorialHomepageDto} from '@/lib/wordpress/homepage-v02-types'

import styles from './homepage.module.css'

interface EditorialReviewNoteProps {
  readonly editorial: SiteAEditorialHomepageDto['editorial']
}

export function EditorialReviewNote({editorial}: EditorialReviewNoteProps) {
  return (
    <section
      className={`${styles.section} ${styles.reviewNote}`}
      aria-labelledby="site-a-editorial-review-heading"
    >
      <h2 id="site-a-editorial-review-heading">Editorial review</h2>
      <dl>
        <div>
          <dt>Reviewed</dt>
          <dd>
            <time dateTime={editorial.reviewedAt}>{editorial.reviewedAt}</time>
          </dd>
        </div>
        <div>
          <dt>Reviewer</dt>
          <dd>{editorial.reviewedBy}</dd>
        </div>
        <div>
          <dt>Scope</dt>
          <dd>{editorial.reviewScope}</dd>
        </div>
      </dl>
    </section>
  )
}
