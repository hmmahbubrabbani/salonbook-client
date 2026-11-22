// src/app/api/v1/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { authorizeServerRoles } from '@/lib/server-auth';

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export async function POST(req: NextRequest) {
  const check = await authorizeServerRoles(['client', 'admin']);
  if (!check.ok) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized' },
      { status: check.status }
    );
  }

  try {
    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json(
        { success: false, message: 'Request must be multipart/form-data.' },
        { status: 400 }
      );
    }

    const formData = await req.formData();
    const rawFile =
      formData.get('file') ?? formData.get('image') ?? formData.get('avatar');

    if (!(rawFile instanceof File) || rawFile.size === 0) {
      return NextResponse.json(
        { success: false, message: 'No valid image file provided.' },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.has(rawFile.type)) {
      return NextResponse.json(
        {
          success: false,
          message: `Unsupported file type (${rawFile.type || 'unknown'}). Use JPG, PNG, WEBP, or GIF.`,
        },
        { status: 400 }
      );
    }

    if (rawFile.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { success: false, message: 'File size must be 5MB or less.' },
        { status: 400 }
      );
    }

    const extFromName = path.extname(rawFile.name || '').toLowerCase();
    const safeExt =
      extFromName ||
      (rawFile.type === 'image/png'
        ? '.png'
        : rawFile.type === 'image/webp'
          ? '.webp'
          : rawFile.type === 'image/gif'
            ? '.gif'
            : '.jpg');

    const fileName = `${Date.now()}-${crypto.randomUUID()}${safeExt}`;
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');

    await mkdir(uploadDir, { recursive: true });
    const bytes = Buffer.from(await rawFile.arrayBuffer());
    await writeFile(path.join(uploadDir, fileName), bytes);

    const url = `/uploads/${fileName}`;

    return NextResponse.json(
      { success: true, url, avatarUrl: url, imageUrl: url },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json(
      { success: false, message: (err as Error).message || 'Upload failed' },
      { status: 500 }
    );
  }
}