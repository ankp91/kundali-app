import { NextRequest, NextResponse } from 'next/server'
const BACKEND = process.env.BACKEND_URL || 'http://localhost:8000'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || ''
  const res = await fetch(`${BACKEND}/api/usage`, {
    headers: { Authorization: authHeader },
    cache: 'no-store',
  })
  return NextResponse.json(await res.json(), { status: res.status })
}
