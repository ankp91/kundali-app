import jsPDF from 'jspdf'

type RGB = [number, number, number]
const DARK: RGB = [6, 13, 46]
const GOLD: RGB = [251, 191, 36]
const SAFFRON: RGB = [251, 146, 60]
const GRAY: RGB = [200, 200, 200]
const MIDBLUE: RGB = [30, 40, 80]
const ROWBLUE: RGB = [10, 20, 50]

async function svgToPng(id: string): Promise<string | null> {
  const el = document.getElementById(id) as SVGSVGElement | null
  if (!el) return null
  const w = parseInt(el.getAttribute('width') || '280')
  const h = parseInt(el.getAttribute('height') || '280')
  const svgData = new XMLSerializer().serializeToString(el)
  const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = w * 2
      canvas.height = h * 2
      const ctx = canvas.getContext('2d')!
      ctx.scale(2, 2)
      ctx.fillStyle = '#060d2e'
      ctx.fillRect(0, 0, w, h)
      ctx.drawImage(img, 0, 0, w, h)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null) }
    img.src = url
  })
}

export async function downloadKundaliPDF(chartData: Record<string, unknown>) {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = 210
  const M = 15

  function bg() {
    pdf.setFillColor(...DARK)
    pdf.rect(0, 0, W, 297, 'F')
  }

  function sectionTitle(text: string, y: number) {
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(11)
    pdf.setTextColor(...GOLD)
    pdf.text(text, M, y)
  }

  // ── PAGE 1: D1 Chart + Planetary Table ──────────────────────────────
  bg()

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(18)
  pdf.setTextColor(...GOLD)
  pdf.text('Kundali Chart', W / 2, 20, { align: 'center' })

  const name = (chartData.name as string) || 'Unknown'
  pdf.setFontSize(13)
  pdf.text(name, W / 2, 29, { align: 'center' })

  const bi = chartData.birth_info as { date: string; time: string; place: string } | undefined
  if (bi) {
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8)
    pdf.setTextColor(...GRAY)
    pdf.text(`${bi.date}  |  ${bi.time}  |  ${bi.place}`, W / 2, 37, { align: 'center' })
  }

  const d1Png = await svgToPng('chart-d1')
  const chartMm = 95
  if (d1Png) {
    pdf.addImage(d1Png, 'PNG', (W - chartMm) / 2, 43, chartMm, chartMm)
  }

  // Planetary positions table
  const planets = chartData.planets as Record<string, {
    sign: string; house: number; degree: number; nakshatra: string; pada: number; is_retrograde: boolean
  }> | undefined

  if (planets) {
    sectionTitle('Planetary Positions', 146)
    const hdrY = 149
    pdf.setFillColor(...MIDBLUE)
    pdf.rect(M, hdrY, W - M * 2, 7, 'F')
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(8)
    pdf.setTextColor(...SAFFRON)
    const C = [M + 2, M + 25, M + 58, M + 105, M + 130, M + 152]
    pdf.text('Planet', C[0], hdrY + 5)
    pdf.text('Sign', C[1], hdrY + 5)
    pdf.text('Nakshatra', C[2], hdrY + 5)
    pdf.text('House', C[3], hdrY + 5)
    pdf.text('Degree', C[4], hdrY + 5)
    pdf.text('Retro', C[5], hdrY + 5)

    const ORDER = ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Rahu','Ketu']
    let ry = hdrY + 7
    pdf.setFont('helvetica', 'normal')
    ORDER.forEach((pname, i) => {
      const p = planets[pname]
      if (!p) return
      ry += 7
      pdf.setFillColor(...(i % 2 === 0 ? ROWBLUE : DARK))
      pdf.rect(M, ry - 4.5, W - M * 2, 7, 'F')
      pdf.setTextColor(...GRAY)
      pdf.setFontSize(8)
      pdf.text(pname, C[0], ry)
      pdf.text(p.sign, C[1], ry)
      pdf.text(`${p.nakshatra} P${p.pada}`, C[2], ry)
      pdf.text(`${p.house}`, C[3], ry)
      pdf.text(`${p.degree}°`, C[4], ry)
      pdf.text(p.is_retrograde ? 'R' : '-', C[5], ry)
    })

    const asc = chartData.ascendant as { sign: string; degree: number } | undefined
    if (asc) {
      ry += 7
      pdf.setFillColor(40, 30, 10)
      pdf.rect(M, ry - 4.5, W - M * 2, 7, 'F')
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(...GOLD)
      pdf.setFontSize(8)
      pdf.text('Ascendant', C[0], ry)
      pdf.text(asc.sign, C[1], ry)
      pdf.text('-', C[2], ry)
      pdf.text('1', C[3], ry)
      pdf.text(`${asc.degree}°`, C[4], ry)
      pdf.text('-', C[5], ry)
    }
  }

  // ── PAGE 2: Divisional Charts ────────────────────────────────────────
  pdf.addPage()
  bg()

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(16)
  pdf.setTextColor(...GOLD)
  pdf.text('Divisional Charts', W / 2, 20, { align: 'center' })

  const divList = [
    { id: 'chart-d9',  title: 'D9 — Navamsa',     sub: 'Marriage · Spiritual self · Dharma' },
    { id: 'chart-d10', title: 'D10 — Dasamsa',    sub: 'Career · Profession · Public life' },
    { id: 'chart-d7',  title: 'D7 — Saptamsa',    sub: 'Children · Progeny · Creativity' },
    { id: 'chart-d12', title: 'D12 — Dwadasamsa', sub: 'Parents · Ancestry · Karma' },
  ]

  const dcW = 84
  const dcH = 84
  const col0 = M
  const col1 = W / 2 + 4

  for (let i = 0; i < divList.length; i++) {
    const dc = divList[i]
    const col = i % 2 === 0 ? col0 : col1
    const row = Math.floor(i / 2)
    const baseY = 26 + row * (dcH + 22)

    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(9)
    pdf.setTextColor(...GOLD)
    pdf.text(dc.title, col, baseY + 6)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(7)
    pdf.setTextColor(...GRAY)
    pdf.text(dc.sub, col, baseY + 11)

    const png = await svgToPng(dc.id)
    if (png) {
      pdf.addImage(png, 'PNG', col, baseY + 13, dcW, dcH)
    }
  }

  // ── PAGE 3: Vimshottari Dasha ────────────────────────────────────────
  pdf.addPage()
  bg()

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(16)
  pdf.setTextColor(...GOLD)
  pdf.text('Vimshottari Dasha', W / 2, 20, { align: 'center' })

  const dashas = chartData.dashas as Array<{
    lord: string; years: number; start: string; end: string; is_current: boolean
  }> | undefined

  if (dashas) {
    const hdrY = 28
    pdf.setFillColor(...MIDBLUE)
    pdf.rect(M, hdrY, W - M * 2, 8, 'F')
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(9)
    pdf.setTextColor(...SAFFRON)
    const DC = [M + 5, M + 50, M + 85, M + 125, M + 155]
    pdf.text('Dasha Lord', DC[0], hdrY + 5.5)
    pdf.text('Duration', DC[1], hdrY + 5.5)
    pdf.text('Start', DC[2], hdrY + 5.5)
    pdf.text('End', DC[3], hdrY + 5.5)
    pdf.text('Status', DC[4], hdrY + 5.5)

    let dy = hdrY + 8
    dashas.forEach((d, i) => {
      dy += 9
      if (d.is_current) {
        pdf.setFillColor(60, 40, 10)
      } else {
        pdf.setFillColor(...(i % 2 === 0 ? ROWBLUE : DARK))
      }
      pdf.rect(M, dy - 5.5, W - M * 2, 9, 'F')
      pdf.setFont('helvetica', d.is_current ? 'bold' : 'normal')
      pdf.setFontSize(9)
      const color: RGB = d.is_current ? GOLD : GRAY
      pdf.setTextColor(...color)
      pdf.text(`${d.lord} Dasha`, DC[0], dy)
      pdf.text(`${d.years} yrs`, DC[1], dy)
      pdf.text(d.start, DC[2], dy)
      pdf.text(d.end, DC[3], dy)
      if (d.is_current) pdf.text('Active', DC[4], dy)
    })
  }

  pdf.save(`${name}_Kundali.pdf`)
}
