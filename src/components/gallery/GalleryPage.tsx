"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import gsap from "gsap";
import { ContentItem, Room, RoomType } from "@/types/gallery";
import { ROOMS } from "@/data/rooms";
import { CartProvider, useCart } from "@/lib/cart";
import { fetchRoomListings } from "@/lib/listings.client";
import RoomView from "./RoomView";
import MapCanvas from "./MapCanvas";
import CartDrawer from "./CartDrawer";

const MAP_STORAGE_KEY = "hortense_has_map";
const PSYCHEDELIC_COLORS = ["#FF2D9B", "#A000FF", "#00D4C8", "#82E000", "#FF6400", "#F5E000"];

function GalleryInner({
  rooms,
  initialRoomContent,
}: {
  rooms: Record<RoomType, Room>;
  initialRoomContent: Partial<Record<RoomType, ContentItem[]>>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { totalCount } = useCart();
  const [hasMap, setHasMap] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [currentRoom, setCurrentRoom] = useState(RoomType.Entrance);
  const [visited, setVisited] = useState<Set<RoomType>>(new Set([RoomType.Entrance]));
  const [transitioning, setTransitioning] = useState(false);
  const [roomContent, setRoomContent] = useState(initialRoomContent);
  const loadedRooms = useRef(new Set(Object.keys(initialRoomContent) as RoomType[]));
  const wrapperRef = useRef<HTMLDivElement>(null);
  const pickUpBtnRef = useRef<HTMLButtonElement>(null);
  const exitBtnRef = useRef<HTMLButtonElement>(null);

  function resolveRoom(type: RoomType): Room {
    return {
      ...rooms[type],
      content: roomContent[type] ?? rooms[type].content,
    };
  }

  useEffect(() => {
    setHasMap(localStorage.getItem(MAP_STORAGE_KEY) === "true");
  }, []);

  useEffect(() => {
    const btn = exitBtnRef.current;
    if (!btn) return;
    const colorTl = gsap.timeline({ repeat: -1 });
    PSYCHEDELIC_COLORS.forEach((color, i) => {
      colorTl.to(btn, { color, borderColor: color, duration: 0.45, ease: "none" }, i * 0.45);
    });
    gsap.to(btn, { scale: 1.1, duration: 1.1, repeat: -1, yoyo: true, ease: "sine.inOut" });
    function glitch() {
      gsap.to(btn, {
        skewX: (Math.random() - 0.5) * 18,
        skewY: (Math.random() - 0.5) * 6,
        duration: 0.06,
        onComplete: () => { gsap.to(btn, { skewX: 0, skewY: 0, duration: 0.12 }); },
      });
      gsap.delayedCall(1.2 + Math.random() * 2.5, glitch);
    }
    glitch();
    return () => gsap.killTweensOf(btn);
  }, []);

  function navigate(to: RoomType) {
    if (transitioning) return;
    setTransitioning(true);
    gsap.to(wrapperRef.current, {
      opacity: 0,
      duration: 0.3,
      ease: "power2.in",
      onComplete: () => {
        void (async () => {
          if (!loadedRooms.current.has(to)) {
            try {
              const content = await fetchRoomListings(to);
              if (content.length > 0) {
                setRoomContent((prev) => ({ ...prev, [to]: content }));
              }
            } catch {
              // Fall back to static content from ROOMS
            }
            loadedRooms.current.add(to);
          }

          setCurrentRoom(to);
          setVisited((prev) => new Set([...Array.from(prev), to]));
          gsap.to(wrapperRef.current, {
            opacity: 1,
            duration: 0.3,
            ease: "power2.out",
            onComplete: () => setTransitioning(false),
          });
        })();
      },
    });
  }

  function pickUpMap() {
    localStorage.setItem(MAP_STORAGE_KEY, "true");
    gsap.to(pickUpBtnRef.current, {
      opacity: 0,
      y: 8,
      duration: 0.2,
      ease: "power2.in",
      onComplete: () => setHasMap(true),
    });
  }

  function exitGallery() {
    const home = pathname.replace(/\/gallery$/, "") || "/";
    gsap.to(wrapperRef.current, {
      opacity: 0,
      scale: 0.92,
      duration: 0.4,
      ease: "power2.in",
      onComplete: () => router.push(home),
    });
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#08000F]">
      <div ref={wrapperRef}>
        <RoomView room={resolveRoom(currentRoom)} onNavigate={navigate} />
      </div>

      {hasMap && <MapCanvas visited={visited} current={currentRoom} />}

      {!hasMap && (
        <button
          ref={pickUpBtnRef}
          onClick={pickUpMap}
          className="fixed bottom-4 right-4 z-50 border border-[#FF2D9B]/30 bg-[#08000F]/80 px-3 py-2 font-grotesk text-[10px] font-bold uppercase tracking-widest text-[#FF2D9B]/50 transition-colors hover:border-[#FF2D9B]/60 hover:text-[#FF2D9B]/80 touch-manipulation"
        >
          Pick up map
        </button>
      )}

      {/* Exit button */}
      <button
        ref={exitBtnRef}
        onClick={exitGallery}
        className="fixed left-4 top-4 z-50 border bg-[#08000F]/70 px-3 py-2 font-grotesk text-[10px] font-bold uppercase tracking-widest touch-manipulation"
        style={{ color: "#FF2D9B", borderColor: "#FF2D9B" }}
      >
        ⊗ leave
      </button>

      {/* Cart button */}
      <button
        onClick={() => setCartOpen(true)}
        className="fixed right-4 top-4 z-50 border border-[#FFFBE0]/20 bg-[#08000F]/90 px-4 py-2 font-grotesk text-[10px] font-bold uppercase tracking-widest text-[#FFFBE0]/60 hover:border-[#FFFBE0]/40 hover:text-[#FFFBE0]/90 touch-manipulation"
      >
        Cart{totalCount > 0 && ` · ${totalCount}`}
      </button>

      {cartOpen && <CartDrawer onClose={() => setCartOpen(false)} />}
    </div>
  );
}

export default function GalleryPage({
  rooms = ROOMS,
  initialRoomContent = {},
}: {
  rooms?: Record<RoomType, Room>;
  initialRoomContent?: Partial<Record<RoomType, ContentItem[]>>;
}) {
  return (
    <CartProvider>
      <GalleryInner rooms={rooms} initialRoomContent={initialRoomContent} />
    </CartProvider>
  );
}
