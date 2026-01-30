import "./globals.css";

export const metadata = {
  title: "nextstep",
  description: "API scaffolding for nextstep",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
