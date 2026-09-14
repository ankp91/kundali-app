import React from 'react'

interface HouseData {
  sign: string
  sign_hindi: string
  planets: string[]
}

interface Props {
  houses: Record<number, HouseData>
  ascendant: { sign: string; sign_hindi: string; degree: number }
  name?: string
  size?: number
  onHouseClick?: (house: number) => void
  selectedHouse?: number | null
}

const PLANET_ABBR: Record<string, string> = {
  Sun: 'Su', Moon: 'Mo', Mercury: 'Me', Venus: 'Ve',
  Mars: 'Ma', Jupiter: 'Ju', Saturn: 'Sa', Rahu: 'Ra', Ketu: 'Ke'
}

// North Indian chart: 4x4 grid, 12 outer cells clockwise from top-left
// Center 2x2 (rows 1-2, cols 1-2) = chart info area
const HOUSE_POSITIONS: Record<number, { row: number; col: number }> = {
  12: { row: 0, col: 0 },
  1:  { row: 0, col: 1 },
  2:  { row: 0, col: 2 },
  3:  { row: 0, col: 3 },
  4:  { row: 1, col: 3 },
  5:  { row: 2, col: 3 },
  6:  { row: 3, col: 3 },
  7:  { row: 3, col: 2 },
  8:  { row: 3, col: 1 },
  9:  { row: 3, col: 0 },
  10: { row: 2, col: 0 },
  11: { row: 1, col: 0 },
}

export default function KundaliChart({
  houses, ascendant, name, size = 480, onHouseClick, selectedHouse
}: Props) {
  const cellSize = size / 4
  const padding = 8

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="rounded-xl"
      style={{ background: '#060d2e', border: '2px solid rgba(251,146,60,0.3)' }}
    >
      {/* Grid lines */}
      {[0, 1, 2, 3, 4].map(i => (
        <React.Fragment key={i}>
          <line x1={i * cellSize} y1={0} x2={i * cellSize} y2={size} stroke="rgba(251,146,60,0.25)" strokeWidth={1} />
          <line x1={0} y1={i * cellSize} x2={size} y2={i * cellSize} stroke="rgba(251,146,60,0.25)" strokeWidth={1} />
        </React.Fragment>
      ))}

      {/* House cells */}
      {Object.entries(HOUSE_POSITIONS).map(([houseStr, { row, col }]) => {
        const house = parseInt(houseStr)
        const houseData = houses[house]
        const x = col * cellSize
        const y = row * cellSize
        const isSelected = selectedHouse === house
        const isLagna = house === 1

        return (
          <g
            key={house}
            onClick={() => onHouseClick?.(house)}
            style={{ cursor: onHouseClick ? 'pointer' : 'default' }}
          >
            <rect
              x={x + 1}
              y={y + 1}
              width={cellSize - 2}
              height={cellSize - 2}
              fill={isSelected ? 'rgba(251,146,60,0.15)' : isLagna ? 'rgba(251,191,36,0.08)' : 'rgba(6,13,46,0.8)'}
              stroke={isSelected ? 'rgba(251,146,60,0.8)' : isLagna ? 'rgba(251,191,36,0.4)' : 'transparent'}
              strokeWidth={isSelected ? 2 : 1}
              rx={2}
            />

            <text
              x={x + padding}
              y={y + padding + 10}
              fontSize={9}
              fill="rgba(251,146,60,0.6)"
              fontFamily="monospace"
            >
              {house}
            </text>

            {houseData && (
              <>
                <text
                  x={x + cellSize / 2}
                  y={y + cellSize / 2 - 6}
                  textAnchor="middle"
                  fontSize={9}
                  fill={isLagna ? 'rgba(251,191,36,0.9)' : 'rgba(245,240,232,0.5)'}
                  fontFamily="sans-serif"
                >
                  {houseData.sign_hindi || houseData.sign}
                </text>

                {houseData.planets.map((planet, i) => (
                  <text
                    key={planet}
                    x={x + cellSize / 2}
                    y={y + cellSize / 2 + 10 + i * 12}
                    textAnchor="middle"
                    fontSize={11}
                    fontWeight="bold"
                    fill="rgba(251,146,60,0.95)"
                    fontFamily="monospace"
                  >
                    {PLANET_ABBR[planet] || planet.slice(0, 2)}
                  </text>
                ))}
              </>
            )}

            {isLagna && (
              <text
                x={x + cellSize - padding}
                y={y + padding + 10}
                textAnchor="end"
                fontSize={8}
                fill="rgba(251,191,36,0.8)"
              >
                Lg
              </text>
            )}
          </g>
        )
      })}

      {/* Center area */}
      <rect
        x={cellSize + 1}
        y={cellSize + 1}
        width={cellSize * 2 - 2}
        height={cellSize * 2 - 2}
        fill="rgba(6,13,46,0.95)"
        stroke="rgba(251,146,60,0.2)"
        strokeWidth={1}
      />
      {name && (
        <text
          x={cellSize * 2}
          y={cellSize * 1.7}
          textAnchor="middle"
          fontSize={12}
          fontWeight="bold"
          fill="rgba(251,191,36,0.9)"
          fontFamily="sans-serif"
        >
          {name}
        </text>
      )}
      <text
        x={cellSize * 2}
        y={cellSize * 2}
        textAnchor="middle"
        fontSize={9}
        fill="rgba(251,146,60,0.7)"
        fontFamily="sans-serif"
      >
        Lagna: {ascendant?.sign}
      </text>
      <text
        x={cellSize * 2}
        y={cellSize * 2.2}
        textAnchor="middle"
        fontSize={8}
        fill="rgba(245,240,232,0.4)"
        fontFamily="sans-serif"
      >
        {ascendant?.degree}°
      </text>
    </svg>
  )
}
