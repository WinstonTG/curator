import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Curator - AI Content Discovery',
  description: 'Personalized recommendations across Music, News, Recipes, Learning, and Events',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
