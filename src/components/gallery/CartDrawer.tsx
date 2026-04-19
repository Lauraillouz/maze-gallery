"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { useCart } from "@/lib/cart";
import { ContentType } from "@/types/gallery";

const TYPE_ACCENT: Record<ContentType, string> = {
  [ContentType.Artwork]: "#FF2D9B",
  [ContentType.Book]: "#00D4C8",
  [ContentType.Article]: "#F5E000",
  [ContentType.Music]: "#A000FF",
};

interface Props {
  onClose: () => void;
}

export default function CartDrawer({ onClose }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const { items, removeItem, totalCount, totalPrice } = useCart();

  useEffect(() => {
    gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: "power2.out" });
    gsap.fromTo(drawerRef.current, { x: "100%" }, { x: "0%", duration: 0.35, ease: "power2.out" });
  }, []);

  function close() {
    gsap.to(drawerRef.current, { x: "100%", duration: 0.3, ease: "power2.in" });
    gsap.to(overlayRef.current, { opacity: 0, duration: 0.25, ease: "power2.in", onComplete: onClose });
  }

  return (
    <>
      {/* Overlay */}
      <div
        ref={overlayRef}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={close}
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className="fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col"
        style={{ background: "#0D0118", borderLeft: "1px solid #FFFBE022" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: "1px solid #FFFBE014" }}>
          <span className="font-grotesk text-[10px] font-bold uppercase tracking-widest text-[#FFFBE0]/60">
            Cart {totalCount > 0 && `· ${totalCount}`}
          </span>
          <button
            onClick={close}
            className="font-grotesk text-[9px] font-bold uppercase tracking-widest text-[#FFFBE0]/30 hover:text-[#FFFBE0]/70 touch-manipulation"
          >
            ✕ close
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {items.length === 0 ? (
            <p className="mt-8 text-center font-grotesk text-[10px] uppercase tracking-widest text-[#FFFBE0]/20">
              Nothing here yet
            </p>
          ) : (
            <ul className="flex flex-col gap-4">
              {items.map(({ item, quantity }) => {
                const accent = TYPE_ACCENT[item.type];
                return (
                  <li
                    key={item.id}
                    className="flex items-start gap-4 py-3"
                    style={{ borderBottom: "1px solid #FFFBE00A" }}
                  >
                    {/* Color swatch */}
                    <div
                      className="mt-1 shrink-0"
                      style={{ width: 10, height: 10, borderRadius: "50%", background: accent, boxShadow: `0 0 8px ${accent}` }}
                    />

                    {/* Info */}
                    <div className="flex flex-1 flex-col gap-1 min-w-0">
                      <span className="font-grotesk text-[11px] font-bold text-[#FFFBE0] truncate">{item.title}</span>
                      <span className="font-grotesk text-[9px] uppercase tracking-widest text-[#FFFBE0]/40">{item.artist}</span>
                      {item.medium && (
                        <span className="font-grotesk text-[9px] text-[#FFFBE0]/30">{item.medium}</span>
                      )}
                    </div>

                    {/* Qty + price + remove */}
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <span className="font-grotesk text-[11px] font-bold" style={{ color: accent }}>
                        €{((item.price ?? 0) * quantity).toLocaleString()}
                      </span>
                      {quantity > 1 && (
                        <span className="font-grotesk text-[9px] text-[#FFFBE0]/30">× {quantity}</span>
                      )}
                      <button
                        onClick={() => removeItem(item.id)}
                        className="font-grotesk text-[8px] uppercase tracking-widest text-[#FFFBE0]/20 hover:text-[#FF2D9B]/70 touch-manipulation transition-colors"
                      >
                        remove
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="px-6 py-5" style={{ borderTop: "1px solid #FFFBE014" }}>
            <div className="mb-4 flex items-center justify-between">
              <span className="font-grotesk text-[10px] uppercase tracking-widest text-[#FFFBE0]/40">Total</span>
              <span className="font-grotesk text-base font-bold text-[#FFFBE0]">
                €{totalPrice.toLocaleString()}
              </span>
            </div>
            <button
              className="w-full py-3 font-grotesk text-[10px] font-bold uppercase tracking-widest text-[#08000F] touch-manipulation"
              style={{ background: "#FF2D9B" }}
            >
              Checkout
            </button>
          </div>
        )}
      </div>
    </>
  );
}
