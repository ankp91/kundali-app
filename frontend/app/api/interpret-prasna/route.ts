import { NextRequest } from 'next/server'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const res = await fetch(`${process.env.BACKEND_URL}/api/interpret-prasna`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return new Response(res.body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
