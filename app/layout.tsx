import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'REBERRYOS - 마케팅 관리 시스템',
  description: '의료/뷰티 마케팅 통합 관리 플랫폼',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
