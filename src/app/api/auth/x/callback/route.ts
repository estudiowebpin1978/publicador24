import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(new URL('/accounts?error=no_code', request.url))
  }

  try {
    const basicAuth = Buffer.from(
      `${process.env.X_API_KEY}:${process.env.X_API_SECRET}`
    ).toString('base64')

    const tokenRes = await fetch('https://api.x.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/x/callback`,
        code_verifier: 'challenge',
      }),
    })
    const tokenData = await tokenRes.json()

    if (tokenData.error) {
      return NextResponse.redirect(
        new URL(`/accounts?error=${encodeURIComponent(tokenData.error_description ?? tokenData.error)}`, request.url)
      )
    }

    return NextResponse.redirect(
      new URL(`/accounts?x_token=${tokenData.access_token}`, request.url)
    )
  } catch {
    return NextResponse.redirect(new URL('/accounts?error=token_exchange_failed', request.url))
  }
}
