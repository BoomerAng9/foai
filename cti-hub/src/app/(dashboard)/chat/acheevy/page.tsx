"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AcheevyChatRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/chat/librechat');
  }, [router]);

  return null;
}
