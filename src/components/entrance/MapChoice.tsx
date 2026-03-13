'use client'

import { useTranslations } from 'next-intl'

interface MapChoiceProps {
  onChoice: (hasMap: boolean) => void
}

export default function MapChoice({ onChoice }: MapChoiceProps) {
  const t = useTranslations('entrance')

  return (
    <div className="flex flex-col items-center gap-8 text-center">
      <p className="font-grotesk text-sm font-bold uppercase tracking-widest text-[#0D0010]">{t('map_choice_title')}</p>
      <div className="flex gap-6">
        <button
          onClick={() => onChoice(true)}
          className="border-2 border-[#0D0010] bg-[#FF2D9B] px-8 py-3 font-grotesk text-sm font-bold uppercase tracking-widest text-[#0D0010] shadow-[4px_4px_0px_#0D0010] transition-all duration-100 hover:bg-[#F5E000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none"
        >
          {t('map_take')}
        </button>
        <button
          onClick={() => onChoice(false)}
          className="border-2 border-[#0D0010] bg-[#00D4C8] px-8 py-3 font-grotesk text-sm font-bold uppercase tracking-widest text-[#0D0010] shadow-[4px_4px_0px_#0D0010] transition-all duration-100 hover:bg-[#A000FF] hover:text-[#FFFBE0] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none"
        >
          {t('map_skip')}
        </button>
      </div>
    </div>
  )
}
