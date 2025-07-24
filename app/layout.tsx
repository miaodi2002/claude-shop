import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Claude AWS Account Marketplace',
  description: 'E-commerce platform for AWS accounts with Claude AI model quotas',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.addEventListener('error', function(e) {
                console.error('Global error:', e.error, e.filename, e.lineno, e.colno);
              });
              window.addEventListener('unhandledrejection', function(e) {
                console.error('Unhandled promise rejection:', e.reason);
              });
            `,
          }}
        />
      </body>
    </html>
  )
}