import { PonyAtmosphere } from './pony-atmosphere'

export function FundoBloom() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="bloom-verde bloom-1" />
      <div className="bloom-verde bloom-2" />
      <div className="bloom-verde bloom-3" />
      <div className="bloom-verde bloom-4" />
      <div className="bloom-verde bloom-5" />
      
      <div 
        className="bloom-grade absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(color-mix(in srgb, var(--primary) 10%, transparent) 1px, transparent 1px),
            linear-gradient(90deg, color-mix(in srgb, var(--primary) 10%, transparent) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }}
      />

      <div className="theme-bg-overlay absolute inset-0" />
      <PonyAtmosphere />
    </div>
  )
}
