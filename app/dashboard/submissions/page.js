'use client';
import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function RedirectHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = searchParams.toString();
    const dept = searchParams.get('dept') || 'Sales';
    
    // Construct the new search params
    const newParams = new URLSearchParams(searchParams);
    if (!newParams.has('dept')) {
      newParams.set('dept', dept);
    }
    
    const target = `/dashboard/reports?${newParams.toString()}`;
    router.replace(target);
  }, [router, searchParams]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', color: 'var(--text-muted)' }}>
      Redirecting to reports...
    </div>
  );
}

export default function SubmissionsRedirectPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RedirectHandler />
    </Suspense>
  );
}
