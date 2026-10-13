// RESTBAR PRO — Authentication & Session Context
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { CurrentUserSession, Profile, Establishment } from '../types/database';
import { db } from '../services/databaseService';
import { getSupabase } from '../lib/supabaseClient';

interface AuthContextValue {
  session: CurrentUserSession | null;
  isLoading: boolean;
  mustChangePassword: boolean;
  login: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  completeFirstLoginPasswordChange: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  switchEstablishment: (establishmentId: string) => void;
  switchUser: (profileId: string) => void;
  refreshSession: () => void;
  availableProfiles: Profile[];
  userEstablishments: Establishment[];
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(() => {
    return sessionStorage.getItem('restbar_user_id');
  });
  const [preferredEstId, setPreferredEstId] = useState<string>('est_bistrot_01');
  const [session, setSession] = useState<CurrentUserSession | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadSession = useCallback(() => {
    if (!currentProfileId) {
      setSession(null);
      setIsLoading(false);
      return;
    }

    try {
      const userSession = db.resolveUserSession(currentProfileId, preferredEstId);
      setSession(userSession);
    } catch (e) {
      console.error('Erreur chargement session:', e);
      setSession(null);
      sessionStorage.removeItem('restbar_user_id');
    } finally {
      setIsLoading(false);
    }
  }, [currentProfileId, preferredEstId]);

  useEffect(() => {
    // Écoute Supabase Auth si client initialisé
    const supabase = getSupabase();
    if (supabase) {
      supabase.auth.getSession().then(({ data: { session: sbSession } }) => {
        if (sbSession?.user?.email) {
          const profile = db.getProfileByEmail(sbSession.user.email);
          if (profile) {
            setCurrentProfileId(profile.id);
          }
        }
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sbSession) => {
        if (sbSession?.user?.email) {
          const profile = db.getProfileByEmail(sbSession.user.email);
          if (profile) {
            setCurrentProfileId(profile.id);
          }
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    }

    loadSession();
  }, [loadSession]);

  useEffect(() => {
    loadSession();
  }, [currentProfileId, preferredEstId, loadSession]);

  const login = async (email: string, password?: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);

    // VÉRIFICATION OBLIGATOIRE DU MOT DE PASSE
    if (!password || password.trim().length === 0) {
      setIsLoading(false);
      return {
        success: false,
        error: 'Mot de passe obligatoire. Veuillez saisir votre mot de passe pour vous connecter.',
      };
    }

    if (password.trim().length < 4) {
      setIsLoading(false);
      return {
        success: false,
        error: 'Mot de passe invalide (minimum 4 caractères requis).',
      };
    }

    const supabase = getSupabase();

    if (supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          setIsLoading(false);
          return { success: false, error: error.message };
        }
        if (data.user) {
          const profile = db.getProfileByEmail(email);
          if (profile) {
            sessionStorage.setItem('restbar_user_id', profile.id);
            setCurrentProfileId(profile.id);
            setIsLoading(false);
            return { success: true };
          }
        }
      } catch (err: any) {
        setIsLoading(false);
        return { success: false, error: err.message };
      }
    }

    // Authentification locale sécurisée via profils enregistrés
    const profile = db.getProfileByEmail(email);
    if (!profile) {
      setIsLoading(false);
      return {
        success: false,
        error: `Aucun utilisateur trouvé avec l'adresse "${email}". Veuillez vérifier votre saisie.`,
      };
    }

    if (!profile.is_active) {
      setIsLoading(false);
      return {
        success: false,
        error: 'Votre compte a été désactivé par le gérant de l’établissement.',
      };
    }

    // Vérification stricte du mot de passe enregistré
    const isPasswordValid = db.verifyUserPassword(profile.id, password);
    if (!isPasswordValid) {
      setIsLoading(false);
      return {
        success: false,
        error: 'Mot de passe incorrect. Veuillez vérifier votre saisie.',
      };
    }

    // Connexion réussie : sauvegarde dans sessionStorage
    sessionStorage.setItem('restbar_user_id', profile.id);
    setCurrentProfileId(profile.id);
    setIsLoading(false);
    return { success: true };
  };

  const logout = async () => {
    const supabase = getSupabase();
    if (supabase) {
      await supabase.auth.signOut();
    }
    // Déconnexion complète : l'utilisateur doit repasser par la page de connexion
    sessionStorage.removeItem('restbar_user_id');
    localStorage.removeItem('restbar_user_id');
    setCurrentProfileId(null);
    setSession(null);
  };

  const changePassword = async (currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> => {
    if (!session) {
      return { success: false, error: 'Aucune session active.' };
    }

    const supabase = getSupabase();
    if (supabase) {
      try {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) {
          return { success: false, error: error.message };
        }
      } catch (err: any) {
        console.warn('Supabase updateUser error:', err);
      }
    }

    const res = db.changeUserPassword(session.user.id, currentPassword, newPassword);
    if (res.success) {
      loadSession();
    }
    return res;
  };

  const completeFirstLoginPasswordChange = async (newPassword: string): Promise<{ success: boolean; error?: string }> => {
    if (!session) {
      return { success: false, error: 'Aucune session active.' };
    }

    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.auth.updateUser({ password: newPassword });
      } catch (err: any) {
        console.warn('Supabase updateUser error during first login:', err);
      }
    }

    const res = db.completeFirstLoginPasswordChange(session.user.id, newPassword);
    if (res.success) {
      loadSession();
    }
    return res;
  };

  const resetPassword = async (email: string): Promise<{ success: boolean; error?: string }> => {
    const supabase = getSupabase();
    if (supabase) {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) return { success: false, error: error.message };
      return { success: true };
    }

    const profile = db.getProfileByEmail(email);
    if (!profile) {
      return { success: false, error: `Adresse "${email}" introuvable dans le système.` };
    }

    return { success: true };
  };

  const switchEstablishment = (establishmentId: string) => {
    setPreferredEstId(establishmentId);
  };

  const switchUser = (profileId: string) => {
    setCurrentProfileId(profileId);
  };

  const refreshSession = () => {
    loadSession();
  };

  const availableProfiles = db.getProfiles();
  const userEstablishments = session
    ? db.getEstablishments(session.user.id, session.isSuperAdmin)
    : [];

  const mustChangePassword = Boolean(session?.mustChangePassword || session?.user?.must_change_password);

  return (
    <AuthContext.Provider
      value={{
        session,
        isLoading,
        mustChangePassword,
        login,
        logout,
        resetPassword,
        changePassword,
        completeFirstLoginPasswordChange,
        switchEstablishment,
        switchUser,
        refreshSession,
        availableProfiles,
        userEstablishments,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
