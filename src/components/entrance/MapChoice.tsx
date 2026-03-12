'use client'

import { useTranslations } from 'next-intl'

interface MapChoiceProps {
  onChoice: (hasMap: boolean) => void
}

export default function MapChoice({ onChoice }: MapChoiceProps) {
  const t = useTranslations('entrance')

  return (
    <div className="flex flex-col items-center gap-8 text-center">
      <p className="font-grotesk text-sm uppercase tracking-widest text-amber/60">{t('map_choice_title')}</p>
      <div className="flex gap-6">
        <button
          onClick={() => onChoice(true)}
          className="border border-amber bg-espresso px-8 py-3 font-grotesk text-sm uppercase tracking-widest text-amber shadow-[3px_3px_0px_rgba(255,133,0,0.3)] transition-all duration-150 hover:bg-amber hover:text-espresso active:shadow-none active:translate-x-px active:translate-y-px"
        >
          {t('map_take')}
        </button>
        <button
          onClick={() => onChoice(false)}
          className="border border-cream/40 bg-espresso px-8 py-3 font-grotesk text-sm uppercase tracking-widest text-cream/60 shadow-[3px_3px_0px_rgba(245,237,214,0.1)] transition-all duration-150 hover:border-cream/70 hover:text-cream active:shadow-none active:translate-x-px active:translate-y-px"
        >
          {t('map_skip')}
        </button>
      </div>
    </div>
  )
}
