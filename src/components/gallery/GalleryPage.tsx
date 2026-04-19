'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import gsap from 'gsap'
import { RoomType } from '@/types/gallery'
import { ROOMS } from '@/data/rooms'
import RoomView from './RoomView'
import MapCanvas from './MapCanvas'

const MAP_STORAGE_KEY = 'hortense_has_map'

const PSYCHEDELIC_COLORS = ['#FF2D9B', '#A000FF', '#00D4C8', '#82E000', '#FF6400', '#F5E000']

export default function GalleryPage() {
  const router = useRouter()
  const pathname = usePathname()
  const [hasMap, setHasMap] = useState(false)
  const [currentRoom, setCurrentRoom] = useState(RoomType.Entrance)
  const [visited, setVisited] = useState<Set<RoomType>>(new Set([RoomType.Entrance]))
  const [transitioning, setTransitioning] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const pickUpBtnRef = useRef<HTMLButtonElement>(null)
  const exitBtnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    setHasMap(localStorage.getItem(MAP_STORAGE_KEY) === 'true')
  }, [])

  function navigate(to: RoomType) {
    if (transitioning) return
    setTransitioning(true)
    gsap.to(wrapperRef.current, {
      opacity: 0,
      duration: 0.3,
      ease: 'power2.in',
      onComplete: () => {
        setCurrentRoom(to)
        setVisited((prev) => new Set([...Array.from(prev), to]))
        gsap.to(wrapperRef.current, {
          opacity: 1,
          duration: 0.3,
          ease: 'power2.out',
          onComplete: () => setTransitioning(false),
        })
      },
    })
  }

  function pickUpMap() {
    localStorage.setItem(MAP_STORAGE_KEY, 'true')
    gsap.to(pickUpBtnRef.current, {
      opacity: 0,
      y: 8,
      duration: 0.2,
      ease: 'power2.in',
      onComplete: () => setHasMap(true),
    })
  }

  useEffect(() => {
    const btn = exitBtnRef.current
    if (!btn) return

    // Color cycle through all room accents
    const colorTl = gsap.timeline({ repeat: -1 })
    PSYCHEDELIC_COLORS.forEach((color, i) => {
      colorTl.to(btn, { color, borderColor: color, duration: 0.45, ease: 'none' }, i * 0.45)
    })

    // Slow scale pulse
    gsap.to(btn, { scale: 1.1, duration: 1.1, repeat: -1, yoyo: true, ease: 'sine.inOut' })

    // Periodic glitch skew
    function glitch() {
      gsap.to(btn, {
        skewX: (Math.random() - 0.5) * 18,
        skewY: (Math.random() - 0.5) * 6,
        duration: 0.06,
        onComplete: () => gsap.to(btn, { skewX: 0, skewY: 0, duration: 0.12 }),
      })
      gsap.delayedCall(1.2 + Math.random() * 2.5, glitch)
    }
    glitch()

    return () => gsap.killTweensOf(btn)
  }, [])

  function exitGallery() {
    const home = pathname.replace(/\/gallery$/, '') || '/'
    gsap.to(wrapperRef.current, {
      opacity: 0,
      scale: 0.92,
      duration: 0.4,
      ease: 'power2.in',
      onComplete: () => router.push(home),
    })
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#08000F]">
      <div ref={wrapperRef}>
        <RoomView room={ROOMS[currentRoom]} onNavigate={navigate} />
      </div>

      {hasMap && <MapCanvas visited={visited} current={currentRoom} />}

      {!hasMap && (
        <button
          ref={pickUpBtnRef}
          onClick={pickUpMap}
          className="fixed bottom-4 right-4 z-50 border border-[#FF2D9B]/30 bg-[#08000F]/80 px-3 py-2 font-grotesk text-[10px] font-bold uppercase tracking-widest text-[#FF2D9B]/50 transition-colors duration-200 hover:border-[#FF2D9B]/60 hover:text-[#FF2D9B]/80"
        >
          Pick up map
        </button>
      )}

      <button
        ref={exitBtnRef}
        onClick={exitGallery}
        className="fixed right-4 top-4 z-50 border bg-[#08000F]/70 px-3 py-2 font-grotesk text-[10px] font-bold uppercase tracking-widest touch-manipulation"
        style={{ color: '#FF2D9B', borderColor: '#FF2D9B' }}
      >
        ⊗ leave
      </button>
    </div>
  )
}
