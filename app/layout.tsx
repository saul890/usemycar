// layout.tsx — the root layout that wraps every single page in the app.
// Think of it as the "outer shell": it sets the HTML structure, loads global CSS,
// and renders the nav bar that persists across page navigations.
import type { Metadata } from 'next'
import './globals.css'
import Nav from '@/components/Nav'

export const metadata: Metadata = {
  title: 'Use My Car',
  description: 'Borrow a neighbour\'s car',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white text-gray-900 antialiased">
        <Nav />
        <main>{children}</main>
      </body>
    </html>
  )
}
