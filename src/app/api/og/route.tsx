// src/app/api/og/route.tsx
import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // 1. Extract params
    const title = searchParams.get('title')?.slice(0, 100) || 'AI Generated Art';
    const prompt = searchParams.get('prompt')?.slice(0, 200) || 'No prompt provided.';
    const imageUrl = searchParams.get('imageUrl');

    if (!imageUrl) {
      return new Response('Missing imageUrl param', { status: 400 });
    }

    // 2. Generate Image
    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'flex-end',
            backgroundColor: '#000',
            position: 'relative',
          }}
        >
          {/* Background Image */}
          <img
            src={imageUrl}
            alt={title}
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: 0.6, // Darken slightly so text pops
            }}
          />

          {/* Gradient Overlay for Text Readability */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '60%',
              background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0) 100%)',
            }}
          />

          {/* Text Content */}
          <div
            style={{
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              padding: '60px',
              gap: '10px',
              zIndex: 10,
            }}
          >
            <div
              style={{
                fontSize: 60,
                fontWeight: 900,
                color: 'white',
                lineHeight: 1.1,
                fontFamily: 'sans-serif',
                textShadow: '0 4px 20px rgba(0,0,0,0.5)',
              }}
            >
              {title}
            </div>
            <div
              style={{
                fontSize: 28,
                color: '#e5e5e5', // Light gray
                lineHeight: 1.4,
                fontFamily: 'monospace',
                maxWidth: '900px',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                backgroundColor: 'rgba(255,255,255,0.1)',
                padding: '10px 20px',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.2)',
              }}
            >
              &gt; {prompt}
            </div>
          </div>

          {/* Brand Watermark (Top Right) */}
          <div
             style={{
                position: 'absolute',
                top: 40,
                right: 40,
                backgroundColor: 'white',
                color: 'black',
                padding: '10px 20px',
                borderRadius: '100px',
                fontWeight: 700,
                fontSize: 20,
                fontFamily: 'sans-serif',
             }}
          >
            Generator.
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e: any) {
    console.log(`${e.message}`);
    return new Response(`Failed to generate the image`, {
      status: 500,
    });
  }
}
