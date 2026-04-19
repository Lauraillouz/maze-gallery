'use client'

import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ContentItem, ContentType } from '@/types/gallery'
import { useCart } from '@/lib/cart'

const TYPE_ACCENT: Record<ContentType, string> = {
  [ContentType.Artwork]: '#FF2D9B',
  [ContentType.Book]:    '#00D4C8',
  [ContentType.Article]: '#F5E000',
  [ContentType.Music]:   '#A000FF',
}

const TYPE_LABEL: Record<ContentType, string> = {
  [ContentType.Artwork]: 'Artwork',
  [ContentType.Book]:    'Book',
  [ContentType.Article]: 'Article',
  [ContentType.Music]:   'Music',
}

function ImagePreview({ item, accent }: { item: ContentItem; accent: string }) {
  if (item.imageUrl)
    return <img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover" />
  if (item.type === ContentType.Artwork)
    return <div className="flex h-full w-full items-center justify-center" style={{ background: `${accent}10` }}><div style={{ width: '55%', height: '65%', background: `${accent}22`, border: `1px solid ${accent}44` }} /></div>
  if (item.type === ContentType.Book)
    return <div className="flex h-full w-full items-center justify-center" style={{ background: `${accent}10` }}><div style={{ width: '45%', height: '65%', background: `${accent}22`, border: `1px solid ${accent}55`, borderRadius: 2, position: 'relative' }}><div style={{ position: 'absolute', left: 0, top: 0, width: 8, height: '100%', background: `${accent}44` }} /></div></div>
  if (item.type === ContentType.Music)
    return (
      <div className="flex h-full w-full items-center justify-center" style={{ background: `${accent}10` }}>
        <div style={{ width: 140, height: 140, borderRadius: '50%', background: `${accent}18`, border: `1px solid ${accent}55`, position: 'relative' }}>
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: `repeating-radial-gradient(circle, transparent 18px, ${accent}11 19px, transparent 20px)` }} />
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 22, height: 22, borderRadius: '50%', background: `${accent}66`, border: `1px solid ${accent}` }} />
        </div>
      </div>
    )
  return <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-8" style={{ background: `${accent}10` }}>{[90,70,85,60,80,65,75].map((w,i) => <div key={i} style={{ height: 2, width: `${w}%`, background: `${accent}44` }} />)}</div>
}

interface Props {
  item: ContentItem
  onClose: () => void
}

export default function ItemDetail({ item, onClose }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const { addItem } = useCart()
  const accent = TYPE_ACCENT[item.type]

  useEffect(() => {
    gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: 'power2.out' })
    gsap.fromTo(panelRef.current, { y: 32, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, ease: 'power2.out' })
  }, [])

  function close() {
    gsap.to(panelRef.current, { y: 16, opacity: 0, duration: 0.2, ease: 'power2.in' })
    gsap.to(overlayRef.current, { opacity: 0, duration: 0.25, ease: 'power2.in', onComplete: onClose })
  }

  function handleAddToCart() {
    addItem(item)
    close()
  }

  return (
    <div ref={overlayRef} className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={close}>
      <div ref={panelRef} className="relative flex w-full max-w-xl flex-col overflow-hidden sm:flex-row" style={{ background: '#0D0118', border: `1px solid ${accent}33`, maxHeight: '90vh' }} onClick={(e) => e.stopPropagation()}>
        <div className="h-52 w-full shrink-0 sm:h-auto sm:w-56">
          <ImagePreview item={item} accent={accent} />
        </div>
        <div className="flex flex-col gap-3 overflow-y-auto p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="font-grotesk text-[9px] font-bold uppercase tracking-widest" style={{ color: accent }}>{TYPE_LABEL[item.type]}</span>
              <h2 className="mt-1 font-grotesk text-base font-bold text-[#FFFBE0]">{item.title}</h2>
              <p className="font-grotesk text-[11px] text-[#FFFBE0]/50">{item.artist}</p>
            </div>
            <button onClick={close} className="shrink-0 font-grotesk text-[9px] font-bold uppercase tracking-widest text-[#FFFBE0]/30 hover:text-[#FFFBE0]/70 touch-manipulation">✕</button>
          </div>
          <div className="flex flex-col gap-1">
            {item.medium && <p className="font-grotesk text-[10px] text-[#FFFBE0]/40">{item.medium}</p>}
            {item.size && <p className="font-grotesk text-[10px] text-[#FFFBE0]/40">{item.size}</p>}
            {item.editionSize && <p className="font-grotesk text-[10px]" style={{ color: `${accent}88` }}>Edition {item.editionNumber}/{item.editionSize}</p>}
          </div>
          {item.description && <p className="font-grotesk text-[11px] leading-relaxed text-[#FFFBE0]/60">{item.description}</p>}
          <div className="mt-auto flex items-center justify-between gap-4 pt-2" style={{ borderTop: `1px solid ${accent}22` }}>
            {item.forSale && item.price !== undefined ? (
              <>
                <span className="font-grotesk text-lg font-bold" style={{ color: accent }}>${item.price.toLocaleString()}</span>
                <button onClick={handleAddToCart} className="px-4 py-2 font-grotesk text-[10px] font-bold uppercase tracking-widest text-[#08000F] touch-manipulation" style={{ background: accent }}>Add to cart</button>
              </>
            ) : (
              <span className="font-grotesk text-[10px] uppercase tracking-widest text-[#FFFBE0]/25">{item.forSale ? 'Contact for price' : 'Not for sale'}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
