import { NextRequest, NextResponse } from 'next/server'
const BACKEND = process.env.BACKEND_URL || 'http://localhost:8000'
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const params = new URLSearchParams({
    date: searchParams.get('date') || '',
    lat:  searchParams.get('lat')  || '',
    lon:  searchParams.get('lon')  || '',
    tz:   searchParams.get('tz')   || '',
  })
  const res = await fetch(`${BACKEND}/api/panchang/monthly?${params}`)
  return NextResponse.json(await res.json())
}
