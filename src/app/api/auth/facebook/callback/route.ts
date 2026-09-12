import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(new URL('/accounts?error=no_code', request.url))
  }

  try {
    const tokenRes = await fetch('https://graph.facebook.com/v19.0/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.FACEBOOK_APP_ID,
        client_secret: process.env.FACEBOOK_APP_SECRET,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/facebook/callback`,
        code,
      }),
    })
    const tokenData = await tokenRes.json()

    if (tokenData.error) {
      return NextResponse.redirect(
        new URL(`/accounts?error=${encodeURIComponent(tokenData.error.message)}`, request.url)
      )
    }

    return NextResponse.redirect(
      new URL(`/accounts?facebook_token=${tokenData.access_token}`, request.url)
    )
  } catch {
    return NextResponse.redirect(new URL('/accounts?error=token_exchange_failed', request.url))
  }
}
