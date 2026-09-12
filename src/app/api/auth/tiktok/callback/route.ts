import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(new URL('/accounts?error=no_code', request.url))
  }

  try {
    const tokenRes = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_key: process.env.TIKTOK_CLIENT_KEY ?? '',
        client_secret: process.env.TIKTOK_CLIENT_SECRET ?? '',
        code,
        grant_type: 'authorization_code',
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/tiktok/callback`,
      }),
    })
    const tokenData = await tokenRes.json()

    if (tokenData.error) {
      return NextResponse.redirect(
        new URL(`/accounts?error=${encodeURIComponent(tokenData.error.description ?? tokenData.error.message)}`, request.url)
      )
    }

    return NextResponse.redirect(
      new URL(`/accounts?tiktok_token=${tokenData.data?.access_token}`, request.url)
    )
  } catch {
    return NextResponse.redirect(new URL('/accounts?error=token_exchange_failed', request.url))
  }
}
