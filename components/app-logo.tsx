'use client'

import { useEffect, useState } from 'react'

export function AppLogo({ size = 32 }: { size?: number }) {
  const [src, setSrc] = useState('/icons/icon-blue-192.png')

  useEffect(() => {
    const variant = localStorage.getItem('carter_logo_variant') ?? 'blue'
    setSrc(`/icons/icon-${variant}-192.png`)
  }, [])

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="Carter" width={size} height={size} className="rounded-lg" />
}
