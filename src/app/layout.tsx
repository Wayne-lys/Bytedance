import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI 创作者辅助生产与分发平台",
  description: "面向训练营交付的 AI 内容创作、审核与分发工作台"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
