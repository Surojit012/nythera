import { NextResponse } from 'next/server';
import { downloadWalrusBlob } from '@/lib/walrus/client';

export const runtime = 'nodejs';

export async function GET(
  request: Request,
  context: { params: Promise<{ blobId: string }> },
) {
  const { blobId } = await context.params;
  const objectId = new URL(request.url).searchParams.get('objectId') ?? undefined;
  if (!blobId) {
    return NextResponse.json({ error: 'blobId is required.' }, { status: 400 });
  }

  try {
    const bytes = await downloadWalrusBlob(blobId, objectId);
    return new NextResponse(bytes, {
      headers: {
        'content-type': 'application/octet-stream',
        'cache-control': 'private, max-age=0',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Walrus download failed.' },
      { status: 502 },
    );
  }
}
