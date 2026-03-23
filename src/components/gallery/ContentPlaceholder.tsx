import { ContentItem, ContentType } from '@/types/gallery'

const TYPE_CONFIG: Record<ContentType, { border: string; bg: string; tag: string }> = {
  [ContentType.Artwork]: {
    border: '#FF2D9B',
    bg: 'rgba(255,45,155,0.07)',
    tag: 'Artwork',
  },
  [ContentType.Book]: {
    border: '#00D4C8',
    bg: 'rgba(0,212,200,0.07)',
    tag: 'Book',
  },
  [ContentType.Article]: {
    border: '#F5E000',
    bg: 'rgba(245,224,0,0.07)',
    tag: 'Article',
  },
}

export default function ContentPlaceholder({ item }: { item: ContentItem }) {
  const { border, bg, tag } = TYPE_CONFIG[item.type]

  return (
    <div
      className="flex flex-col items-center gap-2 p-3"
      style={{
        width: 120,
        height: 164,
        border: `2px solid ${border}`,
        background: bg,
        boxShadow: `0 0 14px ${border}33`,
      }}
    >
      <span
        className="font-grotesk text-[9px] font-bold uppercase tracking-widest"
        style={{ color: border }}
      >
        {tag}
      </span>

      {/* Visual interior per type */}
      {item.type === ContentType.Artwork && (
        <div
          style={{
            width: 84,
            height: 72,
            background: `${border}18`,
            border: `1px solid ${border}44`,
          }}
        />
      )}
      {item.type === ContentType.Book && (
        <div className="flex flex-col gap-[5px] pt-1" style={{ width: 84 }}>
          {[100, 80, 90, 70, 85].map((w, i) => (
            <div
              key={i}
              style={{ height: 2, width: `${w}%`, background: `${border}55` }}
            />
          ))}
        </div>
      )}
      {item.type === ContentType.Article && (
        <div className="flex gap-2 pt-1" style={{ width: 84 }}>
          {[0, 1].map((col) => (
            <div key={col} className="flex flex-1 flex-col gap-[5px]">
              {[90, 75, 85, 70, 80].map((w, i) => (
                <div
                  key={i}
                  style={{ height: 2, width: `${w}%`, background: `${border}55` }}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      <span
        className="mt-auto text-center font-grotesk text-[9px] leading-tight"
        style={{ color: `${border}99` }}
      >
        {item.title}
      </span>
    </div>
  )
}
