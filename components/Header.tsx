'use client';

import { useState } from 'react';
import { LogOut, FileText } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export function Header() {
  const { user } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    if (isSigningOut) return;
    
    setIsSigningOut(true);
    try {
      // Intentar cerrar sesión en Supabase
      const { error } = await supabase.auth.signOut();
      
      // Si hay un error, pero es porque la sesión ya no existe, es un caso válido
      // Simplemente continuamos con la limpieza
      if (error && !error.message.includes('session missing') && !error.message.includes('Auth session missing')) {
        console.error('Error al cerrar sesión:', error);
        // No mostrar alert para errores de sesión faltante, es un caso válido
        if (!error.message.toLowerCase().includes('session')) {
          alert('Error al cerrar sesión: ' + error.message);
          setIsSigningOut(false);
          return;
        }
      }

      // Limpiar el almacenamiento local por si acaso
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (e) {
        // Ignorar errores de limpieza de almacenamiento
      }

      // Esperar un momento para asegurar que la sesión se cierre correctamente
      await new Promise(resolve => setTimeout(resolve, 200));

      // Forzar recarga completa de la página usando la URL actual
      // Esto asegura que se limpie el estado independientemente del dominio
      window.location.replace(window.location.origin);
    } catch (err: any) {
      console.error('Error inesperado al cerrar sesión:', err);
      // Incluso si hay un error, intentar limpiar y redirigir
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (e) {
        // Ignorar
      }
      // Redirigir de todas formas
      window.location.replace(window.location.origin);
    }
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Sistema de Análisis de Documentos</h1>
              <p className="text-xs text-slate-400">Generación Profesional de Informes</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-white">{user?.email}</p>
              <p className="text-xs text-slate-400">Usuario Autenticado</p>
            </div>
            <button
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <LogOut className={`w-4 h-4 ${isSigningOut ? 'animate-spin' : ''}`} />
              {isSigningOut ? 'Cerrando...' : 'Cerrar Sesión'}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

