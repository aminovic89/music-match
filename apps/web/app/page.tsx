'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Home() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('mm_token');
    if (token) {
      router.replace('/home');
    } else {
      setChecked(true);
    }
  }, [router]);

  if (!checked) return null;

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <div className="text-5xl mb-4">🎧</div>
        <h1 className="text-3xl font-semibold text-white mb-2">Music Match</h1>
        <p className="text-gray-400 text-sm mb-10">
          Trouve des gens qui ressentent la musique comme toi.
        </p>

        <div className="flex flex-col gap-3">
          <Link
            href="/register"
            className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-xl transition-colors"
          >
            Créer un compte
          </Link>
          <Link
            href="/login"
            className="w-full py-3 border border-gray-700 text-gray-300 rounded-xl hover:border-gray-500 transition-colors"
          >
            Se connecter
          </Link>
        </div>
      </div>
    </div>
  );
}
