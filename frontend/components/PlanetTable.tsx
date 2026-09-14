interface PlanetData {
  sign: string
  sign_hindi: string
  house: number
  degree: number
  nakshatra: string
  pada: number
  is_retrograde: boolean
}

interface Props {
  planets: Record<string, PlanetData>
  onPlanetClick?: (planet: string, data: PlanetData) => void
  selectedPlanet?: string | null
}

const PLANET_SYMBOLS: Record<string, string> = {
  Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀',
  Mars: '♂', Jupiter: '♃', Saturn: '♄', Rahu: '☊', Ketu: '☋'
}

export default function PlanetTable({ planets, onPlanetClick, selectedPlanet }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-saffron-700/30">
            {['Planet', 'Sign', 'House', 'Degree', 'Nakshatra'].map(h => (
              <th key={h} className="text-left text-saffron-400 py-2 px-3 font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Object.entries(planets).map(([name, data]) => (
            <tr
              key={name}
              onClick={() => onPlanetClick?.(name, data)}
              className={`border-b border-saffron-700/10 transition ${
                onPlanetClick ? 'cursor-pointer hover:bg-saffron-700/10' : ''
              } ${selectedPlanet === name ? 'bg-saffron-700/15' : ''}`}
            >
              <td className="py-2 px-3 text-gold-400 font-medium">
                <span className="mr-2">{PLANET_SYMBOLS[name]}</span>{name}
                {data.is_retrograde && <span className="ml-1 text-red-400 text-xs">(R)</span>}
              </td>
              <td className="py-2 px-3 text-gray-300">{data.sign_hindi || data.sign}</td>
              <td className="py-2 px-3 text-gray-300">{data.house}</td>
              <td className="py-2 px-3 text-gray-400">{data.degree?.toFixed(2)}°</td>
              <td className="py-2 px-3 text-gray-400">{data.nakshatra} P{data.pada}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
