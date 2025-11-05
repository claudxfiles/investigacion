'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Auth } from '@/components/Auth';
import { Dashboard } from '@/components/Dashboard';
import { ResetPassword } from '@/components/ResetPassword';

export default function Home() {
  const { user, loading } = useAuth();
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  useEffect(() => {
    const checkResetFlow = async () => {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const type = hashParams.get('type');
      
      if (type === 'recovery') {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setIsResettingPassword(true);
        }
      }
    };

    checkResetFlow();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session) {
        setIsResettingPassword(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  if (isResettingPassword) {
    return <ResetPassword />;
  }

  return user ? <Dashboard /> : <Auth />;
}

