import { NextRequest, NextResponse } from 'next/server'
const BACKEND = process.env.BACKEND_URL || 'http://localhost:8000'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const authHeader = req.headers.get('authorization') || ''
  const res = await fetch(`${BACKEND}/api/payments/create-subscription`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: authHeader },
    body: JSON.stringify(body),
    cache: 'no-store',
  })
  return NextResponse.json(await res.json(), { status: res.status })
}
