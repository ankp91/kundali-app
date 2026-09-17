import { NextRequest } from 'next/server'

const BACKEND = process.env.BACKEND_URL || 'http://localhost:8000'

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const res = await fetch(`${BACKEND}/api/parse-chart`, {
    method: 'POST',
    body: formData,
  })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
