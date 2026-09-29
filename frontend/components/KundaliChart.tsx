'use client'
import React, { useState } from 'react'

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
  id?: string
  label?: string
}

const PLANET_ABBR: Record<string, string> = {
  Sun: 'Su', Moon: 'Mo', Mercury: 'Me', Venus: 'Ve',
  Mars: 'Ma', Jupiter: 'Ju', Saturn: 'Sa', Rahu: 'Ra', Ketu: 'Ke',
}

const PLANET_COLORS_DARK: Record<string, string> = {
  Sun: '#FF8040', Moon: '#C8C8C8', Mercury: '#48C840',
  Venus: '#FF70B0', Mars: '#FF3838', Jupiter: '#FFD700',
  Saturn: '#6080FF', Rahu: '#AAAAAA', Ketu: '#C05050',
}
const PLANET_COLORS_LIGHT: Record<string, string> = {
  Sun: '#CC3300', Moon: '#444444', Mercury: '#006600',
  Venus: '#CC0055', Mars: '#BB0000', Jupiter: '#886600',
  Saturn: '#0000AA', Rahu: '#666666', Ketu: '#880000',
}

type Pt = [number, number]

function centroid(pts: Pt[]): Pt {
  return [
    pts.reduce((s, [x]) => s + x, 0) / pts.length,
    pts.reduce((s, [, y]) => s + y, 0) / pts.length,
  ]
}

function polyStr(pts: Pt[]): string {
  return pts.map(([x, y]) => `${x},${y}`).join(' ')
}

export default function KundaliChart({
  houses, ascendant, name, size = 480, onHouseClick, selectedHouse, id, label
}: Props) {
  const [dark, setDark] = useState(true)

  const Q = size / 4
  const H = size / 2
  const T = size * 3 / 4
  const S = size

  // 12 triangular house polygons — authentic North Indian diamond layout
  // Each house is a triangle; all 12 together fill the square minus the center diamond
  const POLYS: Record<number, Pt[]> = {
    1:  [[H, 0], [Q, Q], [T, Q]],   // top center — Lagna
    2:  [[S, 0], [T, Q], [H, 0]],   // top right
    3:  [[S, 0], [S, H], [T, Q]],   // right upper
    4:  [[S, H], [T, T], [T, Q]],   // right center
    5:  [[S, S], [T, T], [S, H]],   // right lower
    6:  [[S, S], [H, S], [T, T]],   // bottom right
    7:  [[H, S], [Q, T], [T, T]],   // bottom center
    8:  [[0, S], [H, S], [Q, T]],   // bottom left
    9:  [[0, S], [Q, T], [0, H]],   // left lower
    10: [[0, H], [Q, T], [Q, Q]],   // left center
    11: [[0, 0], [Q, Q], [0, H]],   // left upper
    12: [[0, 0], [H, 0], [Q, Q]],   // top left
  }

  const cid = id ?? 'kc'
  const ys  = size / 480  // scale factor so layout works at any size

  const bg          = dark ? '#060d2e' : '#fdf8ee'
  const gridColor   = dark ? 'rgba(251,146,60,0.55)' : 'rgba(120,50,0,0.6)'
  const innerBorder = dark ? 'rgba(251,146,60,0.18)' : 'rgba(120,50,0,0.2)'
  const outerBorder = dark ? '#C86820' : '#8B4513'
  const selFill     = dark ? 'rgba(251,146,60,0.15)' : 'rgba(200,100,0,0.15)'
  const lagnaFill   = dark ? 'rgba(251,191,36,0.1)'  : 'rgba(200,100,0,0.08)'
  const hNumColor   = dark ? 'rgba(251,146,60,0.6)'  : 'rgba(120,50,0,0.65)'
  const signColor   = dark ? 'rgba(245,240,232,0.55)': 'rgba(80,40,0,0.7)'
  const lagnaSign   = dark ? 'rgba(251,191,36,0.9)'  : '#8B2500'
  const centerBg    = dark ? '#070e32'               : '#fdf8ee'
  const centerBdr   = dark ? 'rgba(251,146,60,0.5)'  : 'rgba(120,50,0,0.6)'
  const nameColor   = dark ? 'rgba(251,191,36,0.95)' : '#8B2500'
  const ascColor    = dark ? 'rgba(251,146,60,0.85)' : '#AA4400'
  const degColor    = dark ? 'rgba(245,240,232,0.45)': 'rgba(80,40,0,0.5)'
  const lagnaLabel  = dark ? 'rgba(251,146,60,0.55)' : 'rgba(120,50,0,0.55)'
  const PC = dark ? PLANET_COLORS_DARK : PLANET_COLORS_LIGHT

  // Houses with cramped centroids near corners (tight space)
  const CRAMPED = new Set([2, 6, 8, 12])
  // Houses on left/right sides where text benefits from rotation
  const ROTATED: Record<number, number> = { 4: 90, 10: -90 }

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <button
        onClick={() => setDark(d => !d)}
        style={{
          fontSize: 11, padding: '3px 14px', borderRadius: 12, cursor: 'pointer',
          background: 'transparent',
          border: `1px solid ${outerBorder}`,
          color: outerBorder,
          letterSpacing: 1,
        }}
      >
        {dark ? '☀ Light' : '🌙 Dark'}
      </button>

      <svg
        id={id}
        width={size}
        height={size}
        viewBox={`0 0 ${S} ${S}`}
        style={{ background: bg, border: `2.5px solid ${outerBorder}`, borderRadius: 8, display: 'block' }}
      >
        <defs>
          {/* Clip each house content to its own triangle */}
          {Object.entries(POLYS).map(([h, pts]) => (
            <clipPath key={h} id={`${cid}-c${h}`}>
              {/* Inset polygon slightly so text doesn't overlap the stroke */}
              <polygon points={polyStr(pts)} />
            </clipPath>
          ))}
        </defs>

        {/* Inner double-border decoration */}
        <rect x={5} y={5} width={S - 10} height={S - 10}
          fill="none" stroke={innerBorder} strokeWidth={1} />

        {/* Corner ornaments */}
        {([[8,8],[S-8,8],[S-8,S-8],[8,S-8]] as Pt[]).map(([x,y], i) => (
          <circle key={i} cx={x} cy={y} r={3}
            fill="none" stroke={dark ? 'rgba(251,146,60,0.4)' : 'rgba(120,50,0,0.4)'}
            strokeWidth={1} />
        ))}

        {/* House triangle cells */}
        {Object.entries(POLYS).map(([hStr, pts]) => {
          const h    = parseInt(hStr)
          const isLagna = h === 1
          const isSel   = selectedHouse === h
          const [cx, cy] = centroid(pts)
          const hd   = houses[h]
          const cramped = CRAMPED.has(h)
          const rotAngle = ROTATED[h]
          const tForm = rotAngle != null ? `rotate(${rotAngle} ${cx} ${cy})` : undefined

          const fill = isSel ? selFill : isLagna ? lagnaFill : 'transparent'
          const fsSgn = Math.max(6, Math.round((cramped ? 8 : 9) * ys))
          const fsPl  = Math.max(6, Math.round((cramped ? 9 : 10) * ys))
          const fsHn  = Math.max(6, Math.round(8 * ys))
          const lineH = Math.max(9, Math.round((cramped ? 11 : 12) * ys))
          const yNum  = cy - Math.round(12 * ys)
          const ySign = cy + Math.round(3 * ys)
          const yPl0  = cy + Math.round(15 * ys)

          return (
            <g key={h}
              onClick={() => onHouseClick?.(h)}
              style={{ cursor: onHouseClick ? 'pointer' : 'default' }}
            >
              <polygon
                points={polyStr(pts)}
                fill={fill}
                stroke={gridColor}
                strokeWidth={1.5}
                strokeLinejoin="miter"
              />

              <g clipPath={`url(#${cid}-c${h})`}>
                {/* House number */}
                <text
                  x={cx} y={yNum}
                  textAnchor="middle" fontSize={fsHn}
                  fill={hNumColor} fontFamily="monospace"
                  transform={tForm}
                >
                  {h}
                </text>

                {/* Sign name (Hindi preferred) */}
                {hd && (
                  <text
                    x={cx} y={ySign}
                    textAnchor="middle" fontSize={fsSgn}
                    fill={isLagna ? lagnaSign : signColor}
                    fontFamily="sans-serif"
                    transform={tForm}
                  >
                    {hd.sign_hindi || hd.sign}
                  </text>
                )}

                {/* Planets — color coded */}
                {hd?.planets.map((pl, i) => (
                  <text
                    key={pl}
                    x={cx} y={yPl0 + i * lineH}
                    textAnchor="middle" fontSize={fsPl}
                    fontWeight="bold"
                    fill={PC[pl] ?? PC.Sun}
                    fontFamily="monospace"
                    transform={tForm}
                  >
                    {PLANET_ABBR[pl] ?? pl.slice(0, 2)}
                  </text>
                ))}
              </g>
            </g>
          )
        })}

        {/* Center diamond — name/ascendant area */}
        <polygon
          points={polyStr([[Q, Q], [T, Q], [T, T], [Q, T]])}
          fill={centerBg}
          stroke={centerBdr}
          strokeWidth={1.5}
        />

        {label && (
          <text x={H} y={H - Math.round(20 * ys)} textAnchor="middle"
            fontSize={Math.max(7, Math.round(11 * ys))}
            fontWeight="bold" fill={nameColor} fontFamily="sans-serif">
            {label}
          </text>
        )}
        {name && !label && (
          <text x={H} y={H - Math.round(16 * ys)} textAnchor="middle"
            fontSize={Math.max(7, Math.round(13 * ys))}
            fontWeight="bold" fill={nameColor} fontFamily="sans-serif">
            {name}
          </text>
        )}
        <text x={H} y={H + Math.round(5 * ys)} textAnchor="middle"
          fontSize={Math.max(7, Math.round(10 * ys))}
          fill={ascColor} fontFamily="sans-serif">
          {ascendant?.sign_hindi || ascendant?.sign}
        </text>
        <text x={H} y={H + Math.round(18 * ys)} textAnchor="middle"
          fontSize={Math.max(6, Math.round(8 * ys))}
          fill={degColor} fontFamily="sans-serif">
          {ascendant?.degree != null ? `${ascendant.degree}°` : ''}
        </text>
        <text x={H} y={H + Math.round(32 * ys)} textAnchor="middle"
          fontSize={Math.max(6, Math.round(7 * ys))}
          fill={lagnaLabel} fontFamily="sans-serif" letterSpacing={1.5}>
          LAGNA
        </text>
      </svg>
    </div>
  )
}
