import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(new URL('/accounts?error=no_code', request.url))
  }

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.YOUTUBE_CLIENT_ID ?? '',
        client_secret: process.env.YOUTUBE_CLIENT_SECRET ?? '',
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/youtube/callback`,
        grant_type: 'authorization_code',
      }),
    })
    const tokenData = await tokenRes.json()

    if (tokenData.error) {
      return NextResponse.redirect(
        new URL(`/accounts?error=${encodeURIComponent(tokenData.error_description ?? tokenData.error)}`, request.url)
      )
    }

    return NextResponse.redirect(
      new URL(`/accounts?youtube_token=${tokenData.access_token}`, request.url)
    )
  } catch {
    return NextResponse.redirect(new URL('/accounts?error=token_exchange_failed', request.url))
  }
}
