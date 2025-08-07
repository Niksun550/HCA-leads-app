import { ImageResponse } from 'next/og'
import { HcaLogoIcon192, HcaLogoIcon512 } from '@/components/icons/hca-logo';

export const runtime = 'edge'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)

    const size = searchParams.has('size') ? searchParams.get('size') : '192'
    const sizeNum = parseInt(size as string, 10)

    if (sizeNum !== 192 && sizeNum !== 512) {
      return new Response(`Error: Invalid size`, { status: 400 })
    }

    const LogoComponent = sizeNum === 192 ? HcaLogoIcon192 : HcaLogoIcon512;

    return new ImageResponse(
      (
        <div
          style={{
            fontSize: 42,
            background: 'white',
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <LogoComponent />
        </div>
      ),
      {
        width: sizeNum,
        height: sizeNum,
      }
    )
  } catch (e: any) {
    console.log(`${e.message}`)
    return new Response(`Failed to generate the image`, {
      status: 500,
    })
  }
}
