import { ContentItem, ContentType } from '@/types/gallery'

const TYPE_ACCENT: Record<ContentType, string> = {
  [ContentType.Artwork]: '#FF2D9B',
  [ContentType.Book]:    '#00D4C8',
  [ContentType.Article]: '#F5E000',
}

const TYPE_TAG: Record<ContentType, string> = {
  [ContentType.Artwork]: 'Artwork',
  [ContentType.Book]:    'Book',
  [ContentType.Article]: 'Article',
}

function ImageArea({ type, accent }: { type: ContentType; accent: string }) {
  if (type === ContentType.Artwork) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ width: 84, height: 72, background: `${accent}18`, border: `1px solid ${accent}44` }}
      >
        <div style={{ width: 40, height: 40, background: `${accent}30`, borderRadius: 2 }} />
      </div>
    )
  }
  if (type === ContentType.Book) {
    return (
      <div style={{ width: 52, height: 72, background: `${accent}20`, border: `1px solid ${accent}55`, borderRadius: 1 }}>
        <div style={{ width: 4, height: '100%', background: `${accent}55`, float: 'left' }} />
      </div>
    )
  }
  // Article
  return (
    <div className="flex flex-col gap-[4px] pt-1" style={{ width: 84 }}>
      {[100, 80, 90, 60, 85, 70].map((w, i) => (
        <div key={i} style={{ height: 2, width: `${w}%`, background: `${accent}55` }} />
      ))}
    </div>
  )
}

export default function ItemCard({ item }: { item: ContentItem }) {
  const accent = TYPE_ACCENT[item.type]

  return (
    <div
      className="flex flex-col items-center gap-2 p-3"
      style={{
        width: 120,
        height: 164,
        border: `2px solid ${accent}`,
        background: `${accent}09`,
        boxShadow: `0 0 14px ${accent}33`,
        position: 'relative',
      }}
    >
      {/* Type tag */}
      <span className="font-grotesk text-[9px] font-bold uppercase tracking-widest" style={{ color: accent }}>
        {TYPE_TAG[item.type]}
      </span>

      <ImageArea type={item.type} accent={accent} />

      {/* Title + artist */}
      <div className="mt-auto w-full text-center">
        <p className="font-grotesk text-[9px] leading-tight" style={{ color: `${accent}cc` }}>
          {item.title}
        </p>
        <p className="font-grotesk text-[8px] leading-tight" style={{ color: `${accent}66` }}>
          {item.artist}
        </p>
      </div>

      {/* Price / for sale indicator */}
      {item.forSale && item.price !== undefined && (
        <div
          className="absolute bottom-2 right-2 font-grotesk text-[8px] font-bold"
          style={{ color: accent }}
        >
          {item.price === 0 ? 'Free' : `$${item.price.toLocaleString()}`}
        </div>
      )}

      {/* Edition badge */}
      {item.editionSize && (
        <div
          className="absolute left-2 top-2 font-grotesk text-[7px] uppercase tracking-wide"
          style={{ color: `${accent}88` }}
        >
          {item.editionNumber}/{item.editionSize}
        </div>
      )}
    </div>
  )
}
