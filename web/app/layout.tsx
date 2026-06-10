import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "爆款视频工厂 | Viral Video Generator",
  description: "上传商品图 → AI生成TikTok/Facebook爆款UGC视频",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
