'use client'

import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { RoomType } from '@/types/gallery'
import { ROOMS } from '@/data/rooms'
import RoomView from './RoomView'
import MapCanvas from './MapCanvas'

const MAP_STORAGE_KEY = 'hortense_has_map'

export default function GalleryPage() {
  const [hasMap, setHasMap] = useState(false)
  const [currentRoom, setCurrentRoom] = useState(RoomType.Entrance)
  const [visited, setVisited] = useState<Set<RoomType>>(new Set([RoomType.Entrance]))
  const [transitioning, setTransitioning] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const pickUpBtnRef = useRef<HTMLButtonElement>(null)

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
<<<<<<< Updated upstream
=======

      {/* Exit button — top left */}
      <button ref={exitBtnRef} onClick={exitGallery} className="fixed left-4 top-4 z-50 border bg-[#08000F]/70 px-3 py-2 font-grotesk text-[10px] font-bold uppercase tracking-widest touch-manipulation" style={{ color: '#FF2D9B', borderColor: '#FF2D9B' }}>
        ⊗ leave
      </button>

      {/* Cart button — top right */}
      <button className="fixed right-4 top-4 z-50 border border-[#FFFBE0]/20 bg-[#08000F]/90 px-4 py-2 font-grotesk text-[10px] font-bold uppercase tracking-widest text-[#FFFBE0]/60 hover:border-[#FFFBE0]/40 hover:text-[#FFFBE0]/90 touch-manipulation">
        Cart {totalCount > 0 && `· ${totalCount}`}
      </button>
>>>>>>> Stashed changes
    </div>
  )
}
