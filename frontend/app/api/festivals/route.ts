import { NextRequest, NextResponse } from 'next/server'
const BACKEND = process.env.BACKEND_URL || 'http://localhost:8000'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const params = new URLSearchParams({
    year: searchParams.get('year') || '',
    lat:  searchParams.get('lat')  || '',
    lon:  searchParams.get('lon')  || '',
    tz:   searchParams.get('tz')   || '',
  })
  const res = await fetch(`${BACKEND}/api/festivals?${params}`)
  if (!res.ok) return NextResponse.json({ error: 'Backend error' }, { status: res.status })
  return NextResponse.json(await res.json())
}
