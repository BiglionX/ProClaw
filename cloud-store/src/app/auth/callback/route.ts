import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error) {
    return NextResponse.redirect(new URL('/login?error=' + encodeURIComponent(error), request.url));
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.redirect(new URL('/app/auth/callback?code=' + code + '&state=' + state, request.url));
}
