'use client'

interface Cota {
  socioNome: string
  socioCor: string
  percentual: number
}

interface CotaVisualizerProps {
  cotas: Cota[]
  showLegend?: boolean
}

export function CotaVisualizer({ cotas, showLegend = true }: CotaVisualizerProps) {
  return (
    <div className="space-y-2">
      <div className="h-3 w-full rounded-full overflow-hidden flex">
        {cotas.map((cota, index) => (
          <div
            key={index}
            style={{
              width: `${cota.percentual}%`,
              backgroundColor: cota.socioCor,
            }}
            className="h-full"
            title={`${cota.socioNome}: ${cota.percentual.toFixed(1)}%`}
          />
        ))}
      </div>
      {showLegend && (
        <div className="flex flex-wrap gap-3 text-xs">
          {cotas.map((cota, index) => (
            <div key={index} className="flex items-center gap-1">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: cota.socioCor }}
              />
              <span className="text-gray-400">
                {cota.socioNome} ({cota.percentual.toFixed(0)}%)
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
