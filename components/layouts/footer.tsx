import React from 'react'
import Link from 'next/link'

export function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="container flex flex-col items-center justify-between gap-4 py-10 md:h-24 md:flex-row md:py-0">
        <div className="flex flex-col items-center gap-4 px-8 md:flex-row md:gap-2 md:px-0">
          <div className="flex items-center space-x-2">
            <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xs">C</span>
            </div>
            <span className="font-bold">Claude Shop</span>
          </div>
          <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            Premium AWS accounts with Claude AI model quotas.
          </p>
        </div>
        
        <div className="flex items-center space-x-6 text-sm">
          <Link
            href="/accounts"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            All Accounts
          </Link>
          <Link
            href="/search"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Search
          </Link>
          <a
            href="https://t.me/your_telegram"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Contact
          </a>
        </div>
      </div>
    </footer>
  )
}