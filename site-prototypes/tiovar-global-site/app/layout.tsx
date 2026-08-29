import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? 'http://localhost:3000'),
  title: 'TIOVAR | Titanium Dioxide for Application-Specific Evaluation',
  description:
    'Explore TIOVAR titanium dioxide products, application guidance and technical resources for controlled formulation evaluation.',
  openGraph: {
    title: 'TIOVAR | Better TiO₂ selection starts with the system.',
    description:
      'Explore products, application guidance and technical resources for controlled titanium dioxide evaluation.',
    images: [{url: '/og.png', width: 1200, height: 630, alt: 'TIOVAR titanium dioxide selection'}],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TIOVAR | Better TiO₂ selection starts with the system.',
    description:
      'Explore products, application guidance and technical resources for controlled titanium dioxide evaluation.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
