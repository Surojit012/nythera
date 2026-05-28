import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function getUpstreamApi(): string {
  const explicit = process.env.CDR_UPSTREAM_API_URL;
  if (explicit) return explicit;

  const publicApiUrl = process.env.NEXT_PUBLIC_CDR_API_URL;
  if (publicApiUrl?.startsWith('http://') || publicApiUrl?.startsWith('https://')) {
    return publicApiUrl;
  }

  return 'https://aeneid.storyrpc.io';
}

function buildUpstreamUrl(path: string[], searchParams: URLSearchParams): string {
  const normalizedPath = path.join('/');
  const url = new URL(`${getUpstreamApi().replace(/\/$/, '')}/${normalizedPath}`);
  for (const [key, value] of searchParams.entries()) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

async function proxy(request: NextRequest, path: string[]) {
  const upstreamUrl = buildUpstreamUrl(path, request.nextUrl.searchParams);

  try {
    const body =
      request.method === 'GET' || request.method === 'HEAD'
        ? undefined
        : await request.arrayBuffer();

    const response = await fetch(upstreamUrl, {
      method: request.method,
      headers: {
        'content-type': request.headers.get('content-type') ?? 'application/json',
      },
      body,
      cache: 'no-store',
    });

    const responseBody = await response.arrayBuffer();
    const upstreamContentType = response.headers.get('content-type');
    const hasBody = responseBody.byteLength > 0;

    if (!response.ok && !hasBody) {
      return NextResponse.json(
        {
          error: `Upstream returned ${response.status} with empty body`,
          upstreamUrl,
          upstreamStatus: response.status,
        },
        { status: response.status },
      );
    }

    return new NextResponse(responseBody, {
      status: response.status,
      headers: {
        'content-type': upstreamContentType ?? 'application/json',
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'CDR proxy failed',
        upstreamUrl,
      },
      { status: 502 },
    );
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  return proxy(request, path);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  return proxy(request, path);
}
