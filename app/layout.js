import './globals.css';

export const metadata = {
  title: 'Strategic Command Center',
  description: 'Admin Operational Cockpit',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
