import { NextRequest, NextResponse } from 'next/server'
const BACKEND = process.env.BACKEND_URL || 'http://localhost:8000'
export async function POST(req: NextRequest) {
  const body = await req.json()
  const res = await fetch(`${BACKEND}/api/varshaphal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Error' }))
    return NextResponse.json(err, { status: res.status })
  }
  return NextResponse.json(await res.json())
}
