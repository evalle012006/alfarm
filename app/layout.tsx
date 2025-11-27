import './globals.css'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'AlFarm Resort and Adventure Park - Nature & Adventure Awaits',
  description: 'Experience the perfect blend of nature, adventure, and luxury at AlFarm Resort and Adventure Park. Zip-lining, nature trails, comfortable accommodations, and unforgettable experiences.',
  keywords: 'resort, adventure park, nature resort, zip-lining, hiking, accommodation, vacation',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body
        className={`${inter.className} bg-white text-slate-900 dark:bg-slate-950 dark:text-white`}
      >
        {children}
      </body>
    </html>
  )
}
