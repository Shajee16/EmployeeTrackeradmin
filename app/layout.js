import './globals.css';

export const metadata = {
  title: 'Strategic Command Center',
  description: 'Admin Operational Cockpit',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
