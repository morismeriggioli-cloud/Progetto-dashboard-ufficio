"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { Session, User } from "@supabase/supabase-js";
import { translateAuthError } from "@/lib/auth-error";
import type { UserRole } from "@/lib/roles";
import { supabase, supabaseAuthStorageKey } from "@/lib/supabase";

type LoginResult =
  | { success: true; session: Session | null }
  | { success: false; error: string };

type RefreshProfileResult = "ok";

type AuthUser = {
  id: string;
  email: string;
  fullName: string | null;
  name: string;
};

type UserProfile = {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole | null;
};

function getEffectiveDashboardRole(email?: string | null): UserRole | null {
  if (!email) {
    return null;
  }

  return null;
}

type AuthContextValue = {
  isAuthenticated: boolean;
  isLoading: boolean;
  isProfileLoading: boolean;
  user: AuthUser | null;
  profile: UserProfile | null;
  profileError: string | null;
  isProfileMissing: boolean;
  session: Session | null;
  role: UserRole | null;
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function buildProfile(user: User | null, data?: Partial<UserProfile> | null): UserProfile | null {
  if (!user?.id || !user.email) {
    return null;
  }

  const effectiveRole = getEffectiveDashboardRole(
    typeof data?.email === "string" && data.email ? data.email : user.email
  );

  const fullName =
    typeof data?.full_name === "string"
      ? data.full_name
      : typeof user.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name
        : null;

  return {
    id: user.id,
    email: typeof data?.email === "string" && data.email ? data.email : user.email,
    full_name: fullName,
    role: effectiveRole ?? data?.role ?? null,
  };
}

function mapUser(user: User | null, profile: UserProfile | null): AuthUser | null {
  const currentProfile = buildProfile(user, profile);

  if (!currentProfile) {
    return null;
  }

  return {
    id: currentProfile.id,
    email: currentProfile.email,
    fullName: currentProfile.full_name,
    name: currentProfile.full_name || currentProfile.email.split("@")[0],
  };
}

function getNetworkErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Errore di rete sconosciuto.";
}

function clearStorageValue(storage: Storage, key: string) {
  try {
    storage.removeItem(key);
  } catch (error) {
    console.error("[auth] failed to clear storage key:", { key, error });
  }
}

function clearPersistedAuthStorage() {
  if (typeof window === "undefined") {
    return;
  }

  const candidateKeys = new Set<string>([
    supabaseAuthStorageKey,
    "supabase.auth.token",
  ]);

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (key && /^sb-.*-auth-token$/.test(key)) {
      candidateKeys.add(key);
    }
  }

  for (let index = 0; index < window.sessionStorage.length; index += 1) {
    const key = window.sessionStorage.key(index);
    if (key && /^sb-.*-auth-token$/.test(key)) {
      candidateKeys.add(key);
    }
  }

  for (const key of candidateKeys) {
    clearStorageValue(window.localStorage, key);
    clearStorageValue(window.sessionStorage, key);
  }
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${label} timeout dopo ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isProfileMissing, setIsProfileMissing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const router = useRouter();
  const sessionRef = useRef<Session | null>(null);
  const profileRef = useRef<UserProfile | null>(null);
  const isProfileLoadingRef = useRef(false);
  const latestProfileRequestRef = useRef(0);

  const setProfileLoadingState = useCallback((value: boolean) => {
    isProfileLoadingRef.current = value;
    setIsProfileLoading(value);
  }, []);

  const clearProfileState = useCallback(() => {
    latestProfileRequestRef.current += 1;
    profileRef.current = null;
    setProfile(null);
    setProfileError(null);
    setIsProfileMissing(false);
    setProfileLoadingState(false);
  }, [setProfileLoadingState]);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  const refreshProfile = useCallback(
    async (userId?: string, sessionUser?: User | null): Promise<RefreshProfileResult> => {
      const activeUser = sessionUser ?? sessionRef.current?.user ?? null;
      const profileId = userId ?? activeUser?.id;
      const effectiveRole = getEffectiveDashboardRole(activeUser?.email);
      const requestId = latestProfileRequestRef.current + 1;

      latestProfileRequestRef.current = requestId;

      console.log("[auth] refreshProfile called with:", {
        requestId,
        profileId,
        userId,
        sessionUserId: sessionRef.current?.user?.id,
      });

      if (!profileId) {
        console.log("[auth] no profileId, clearing profile state");
        clearProfileState();
        return "ok";
      }

      if (profileRef.current?.id && profileRef.current.id !== profileId) {
        console.log("[auth] clearing stale profile before loading next user:", {
          currentProfileId: profileRef.current.id,
          nextProfileId: profileId,
        });
        profileRef.current = null;
        setProfile(null);
      }

      setProfileLoadingState(true);
      profileRef.current = null;
      setProfile(null);
      setProfileError(null);
      setIsProfileMissing(false);

      const timeoutMs = 5000;
      const isStaleRequest = () =>
        latestProfileRequestRef.current !== requestId || sessionRef.current?.user?.id !== profileId;

      try {
        console.log("[auth] fetching profile from public.profiles for id:", profileId);

        const profilePromise = Promise.resolve(
          supabase
            .from("profiles")
            .select("role, email, full_name")
            .eq("id", profileId)
            .maybeSingle()
        );

        const { data, error } = await withTimeout(profilePromise, timeoutMs, "Caricamento profilo");

        console.log("[auth] profile query result:", { data, error });

        if (isStaleRequest()) {
          console.log("[auth] ignoring stale profile query result:", {
            requestId,
            profileId,
            currentSessionUserId: sessionRef.current?.user?.id,
          });
          return "ok";
        }

        if (error) {
          console.error("[auth] profile fetch error:", {
            error,
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
            profileId,
          });

          if (effectiveRole) {
            const fallbackProfile = buildProfile(activeUser, {
              id: profileId,
              email: activeUser?.email ?? "",
              role: effectiveRole,
            });
            profileRef.current = fallbackProfile;
            setProfile(fallbackProfile);
            setProfileError(null);
            return "ok";
          }

          const fallbackProfile = buildProfile(activeUser, {
            id: profileId,
            email: activeUser?.email ?? "",
            full_name:
              typeof activeUser?.user_metadata?.full_name === "string"
                ? activeUser.user_metadata.full_name
                : null,
          });
          profileRef.current = fallbackProfile;
          setProfile(fallbackProfile);
          setProfileError(null);
          return "ok";
        }

        if (!data) {
          console.error("[auth] profile not found for user:", { profileId, activeUser });

          if (effectiveRole) {
            const fallbackProfile = buildProfile(activeUser, {
              id: profileId,
              email: activeUser?.email ?? "",
              role: effectiveRole,
            });
            profileRef.current = fallbackProfile;
            setProfile(fallbackProfile);
            setProfileError(null);
            setIsProfileMissing(false);
            return "ok";
          }

          const fallbackProfile = buildProfile(activeUser, {
            id: profileId,
            email: activeUser?.email ?? "",
            full_name:
              typeof activeUser?.user_metadata?.full_name === "string"
                ? activeUser.user_metadata.full_name
                : null,
          });
          profileRef.current = fallbackProfile;
          setProfile(fallbackProfile);
          setIsProfileMissing(false);
          setProfileError(null);
          return "ok";
        }

        console.log("[auth] profile data found:", { profileData: data });

        const nextRole = effectiveRole ?? null;

        const finalProfile = buildProfile(activeUser, {
          id: profileId,
          email: data.email,
          full_name: data.full_name,
          role: nextRole,
        });

        console.log("[auth] setting final profile:", finalProfile);
        profileRef.current = finalProfile;
        setProfile(finalProfile);

        return "ok";
      } catch (error) {
        console.error("[auth] profile fetch failed:", {
          error,
          message: error instanceof Error ? error.message : "Unknown error",
          profileId,
          activeUser,
        });

        if (isStaleRequest()) {
          console.log("[auth] ignoring stale profile failure:", {
            requestId,
            profileId,
            currentSessionUserId: sessionRef.current?.user?.id,
          });
          return "ok";
        }

        if (effectiveRole) {
          const fallbackProfile = buildProfile(activeUser, {
            id: profileId,
            email: activeUser?.email ?? "",
            role: effectiveRole,
          });
          profileRef.current = fallbackProfile;
          setProfile(fallbackProfile);
          setProfileError(null);
          return "ok";
        }

        const fallbackProfile = buildProfile(activeUser, {
          id: profileId,
          email: activeUser?.email ?? "",
          full_name:
            typeof activeUser?.user_metadata?.full_name === "string"
              ? activeUser.user_metadata.full_name
              : null,
        });
        profileRef.current = fallbackProfile;
        setProfile(fallbackProfile);
        setProfileError(null);
        return "ok";
      } finally {
        if (latestProfileRequestRef.current === requestId) {
          setProfileLoadingState(false);
          console.log("[auth] refreshProfile completed, isProfileLoading set to false");
        } else {
          console.log("[auth] refreshProfile completed for stale request:", { requestId, profileId });
        }
      }
    },
    [clearProfileState, setProfileLoadingState]
  );

  useEffect(() => {
    let isMounted = true;

    const loadSession = async () => {
      console.log("[auth] loading initial session");

      let data: { session: Session | null } = { session: null };
      let error: { message?: string; code?: string } | null = null;

      try {
        const result = await supabase.auth.getSession();
        data = result.data;
        error = result.error;
      } catch (caughtError) {
        console.error("[auth] getSession network error:", caughtError);
        error = { message: getNetworkErrorMessage(caughtError) };
      }

      if (!isMounted) {
        return;
      }

      if (error) {
        console.error("[auth] getSession error:", {
          error,
          message: error.message,
          code: error.code,
        });

        clearProfileState();
        setIsLoading(false);
        return;
      }

      console.log("[auth] initial session data:", {
        session: data.session,
        user: data.session?.user?.id,
      });

      sessionRef.current = data.session ?? null;
      setSession(data.session ?? null);
      setIsLoading(false);

      if (data.session?.user?.id) {
        console.log("[auth] session exists, fetching profile for user:", data.session.user.id);
        await refreshProfile(data.session.user.id, data.session.user);
      } else {
        console.log("[auth] no session, clearing profile state");
        clearProfileState();
      }
    };

    void loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      const currentSession = sessionRef.current;

      console.log("[auth] session status changed:", {
        event,
        userId: nextSession?.user?.id,
        hasSession: !!nextSession,
      });

      if (
        currentSession?.access_token === nextSession?.access_token &&
        currentSession?.user?.id === nextSession?.user?.id
      ) {
        console.log("[auth] session unchanged, skipping update");
        return;
      }

      sessionRef.current = nextSession;
      setSession(nextSession);
      setIsLoading(false);

      if (!nextSession?.user) {
        console.log("[auth] session cleared, clearing profile state");
        clearProfileState();
        return;
      }

      if (nextSession.user.id !== currentSession?.user?.id) {
        console.log("[auth] user ID changed, refreshing profile");
        await refreshProfile(nextSession.user.id, nextSession.user);
        return;
      }

      console.log("[auth] same user ID, no profile refresh needed");
      setProfileLoadingState(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [clearProfileState, refreshProfile, setProfileLoadingState]);

  const user = useMemo<AuthUser | null>(
    () => mapUser(session?.user ?? null, profile),
    [profile, session?.user]
  );
  const role = profile?.role ?? null;

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: Boolean(session),
      isLoading,
      isProfileLoading,
      user,
      profile,
      profileError,
      isProfileMissing,
      session,
      role,
      async login(email, password) {
        const authTimeoutMs = 10000;
        let data: { session: Session | null } = { session: null };
        let error: { message?: string } | null = null;

        try {
          const result = await withTimeout(
            supabase.auth.signInWithPassword({
              email,
              password,
            }),
            authTimeoutMs,
            "Login Supabase"
          );
          data = result.data;
          error = result.error;
        } catch (caughtError) {
          console.error("[auth] login network error:", caughtError);
          return {
            success: false,
            error: `Connessione a Supabase non riuscita: ${getNetworkErrorMessage(caughtError)}`,
          };
        }

        console.log("[auth] login response:", data);

        if (error) {
          console.error("[auth] login error:", error);
          return {
            success: false,
            error: translateAuthError(error.message),
          };
        }

        let currentSession: Session | null = null;
        let sessionError: { message?: string } | null = null;

        try {
          const sessionResult = await withTimeout(
            supabase.auth.getSession(),
            authTimeoutMs,
            "Verifica sessione"
          );
          currentSession = sessionResult.data.session;
          sessionError = sessionResult.error;
        } catch (caughtError) {
          console.error("[auth] session check network error:", caughtError);
          sessionError = { message: getNetworkErrorMessage(caughtError) };
        }

        if (sessionError) {
          console.error("[auth] session check error:", sessionError);
        }

        console.log("[auth] session status after login:", currentSession);

        const activeSession = currentSession ?? data.session ?? null;

        sessionRef.current = activeSession;
        setSession(activeSession);

        const profileStatus = await refreshProfile(
          activeSession?.user?.id,
          activeSession?.user ?? null
        );

        if (profileStatus !== "ok") {
          return {
            success: false,
            error: "Accesso riuscito, ma non e stato possibile inizializzare la sessione.",
          };
        }

        return {
          success: true,
          session: activeSession,
        };
      },
      async logout() {
        let error: { message?: string } | null = null;

        try {
          const result = await supabase.auth.signOut();
          error = result.error;
        } catch (caughtError) {
          console.error("[auth] logout network error:", caughtError);
        }

        if (error) {
          console.error("[auth] logout error:", error);
        }

        clearPersistedAuthStorage();
        sessionRef.current = null;
        setSession(null);
        clearProfileState();
        router.push("/login");
      },
      refreshProfile: async () => {
        await refreshProfile();
      },
    }),
    [
      clearProfileState,
      isLoading,
      isProfileLoading,
      isProfileMissing,
      profile,
      profileError,
      refreshProfile,
      role,
      router,
      session,
      user,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth deve essere usato all'interno di AuthProvider.");
  }

  return context;
}
