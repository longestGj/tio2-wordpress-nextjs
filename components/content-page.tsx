import type {ContentPageDto} from '@/lib/wordpress/types'

interface ContentPageProps {
  readonly page: ContentPageDto
}

export function ContentPage({page}: ContentPageProps) {
  return (
    <article>
      <h1>{page.title}</h1>
      <div dangerouslySetInnerHTML={{__html: page.html}} />
    </article>
  )
}
