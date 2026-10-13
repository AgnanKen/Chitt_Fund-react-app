import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthContext } from "./authContextValue";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  const resetAuthState = useCallback(() => {
    setUser(null);
    setProfile(null);
    setRole(null);
  }, []);

  const hydrateUser = useCallback(
    async (sessionUser, fallbackProfile = null) => {
      if (!sessionUser) {
        resetAuthState();
        return;
      }

      let profileRow = fallbackProfile;

      if (isSupabaseConfigured()) {
        try {
          if (!profileRow) {
            const { data: fetchedProfile } = await supabase
              .from("profiles")
              .select("*, members(*)")
              .eq("id", sessionUser.id)
              .maybeSingle();
            if (fetchedProfile && fetchedProfile.member_id) {
              profileRow = fetchedProfile;
            }
          }

          // If still no member_id linked, check members table by email or auto-create one!
          if (!profileRow?.member_id) {
            let memberRow = profileRow?.members;
            if (!memberRow) {
              const { data: existingMember } = await supabase
                .from("members")
                .select("*")
                .ilike("email", sessionUser.email)
                .maybeSingle();
              memberRow = existingMember;
            }

            // Auto-create member record if not yet existing in members table
            if (!memberRow) {
              const cleanFullName =
                sessionUser.user_metadata?.full_name ||
                sessionUser.email?.split("@")[0] ||
                "Member";
              const cleanPhone = sessionUser.user_metadata?.phone || "";
              const initials =
                cleanFullName
                  .split(" ")
                  .map((part) => part[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase() || "M";

              const { data: createdMember, error: insertErr } = await supabase
                .from("members")
                .insert([
                  {
                    full_name: cleanFullName,
                    email: sessionUser.email,
                    phone: cleanPhone,
                    kyc_status: "Approved",
                    role: "Member",
                    avatar_initials: initials,
                    total_invested: 0,
                    chits_enrolled: 0,
                  },
                ])
                .select()
                .maybeSingle();

              if (!insertErr && createdMember) {
                memberRow = createdMember;
              }
            }

            if (memberRow) {
              profileRow = {
                id: sessionUser.id,
                email: sessionUser.email,
                full_name: memberRow.full_name || sessionUser.user_metadata?.full_name || "Member",
                role: (memberRow.role || sessionUser.user_metadata?.role || "member").toLowerCase(),
                avatar_initials: memberRow.avatar_initials || "M",
                member_id: memberRow.id,
                members: memberRow,
              };

              // Sync with profiles table if it exists
              try {
                await supabase.from("profiles").upsert({
                  id: sessionUser.id,
                  email: sessionUser.email,
                  full_name: profileRow.full_name,
                  role: profileRow.role,
                  avatar_initials: profileRow.avatar_initials,
                  member_id: memberRow.id,
                });
              } catch (_) {
                // Table might not exist yet if supabase_auth.sql has not been run
              }
            }
          }
        } catch (fetchErr) {
          console.warn("Unable to fetch/link profiles from Supabase:", fetchErr);
        }
      }

      const defaultRole =
        profileRow?.role ||
        sessionUser.user_metadata?.role ||
        (sessionUser.email?.toLowerCase().includes("admin") ? "admin" : "member");

      const fullName =
        profileRow?.full_name ||
        sessionUser.user_metadata?.full_name ||
        sessionUser.email?.split("@")[0] ||
        "Member";

      const initials =
        profileRow?.avatar_initials ||
        fullName
          .split(" ")
          .map((part) => part[0])
          .join("")
          .slice(0, 2)
          .toUpperCase() ||
        "M";

      const finalProfile = profileRow || {
        id: sessionUser.id,
        email: sessionUser.email,
        full_name: fullName,
        role: defaultRole,
        avatar_initials: initials,
        member_id: null,
      };

      setUser(sessionUser);
      setProfile(finalProfile);
      setRole(finalProfile.role || defaultRole);
    },
    [resetAuthState]
  );

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!isMounted) return;

        if (session?.user) {
          let profileRow = null;
          try {
            const { data: pData } = await supabase
              .from("profiles")
              .select("*, members(*)")
              .eq("id", session.user.id)
              .maybeSingle();
            profileRow = pData;
          } catch (profileErr) {
            console.warn("Error restoring user profile:", profileErr);
          }

          if (isMounted) {
            await hydrateUser(session.user, profileRow || null);
          }
        } else {
          resetAuthState();
        }
      } catch (error) {
        console.warn("Unable to restore session:", error);
        if (isMounted) resetAuthState();
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initializeAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!isMounted) return;

        try {
          if (session?.user) {
            let profileRow = null;
            try {
              const { data: pData } = await supabase
                .from("profiles")
                .select("*, members(*)")
                .eq("id", session.user.id)
                .maybeSingle();
              profileRow = pData;
            } catch (profileErr) {
              console.warn("Error on auth state change profile query:", profileErr);
            }

            await hydrateUser(session.user, profileRow || null);
          } else {
            resetAuthState();
          }
        } catch (error) {
          console.warn("Auth state change failed:", error);
          resetAuthState();
        } finally {
          setLoading(false);
        }
      }
    );

    return () => {
      isMounted = false;
      authListener?.subscription?.unsubscribe?.();
    };
  }, [hydrateUser, resetAuthState]);

  const signInWithPassword = useCallback(
    async (email, password) => {
      const normalizedEmail = String(email || "").trim().toLowerCase();
      const normalizedPassword = String(password || "");

      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: normalizedPassword,
      });

      if (error) {
        throw error;
      }

      const sessionUser = data?.user;

      if (sessionUser) {
        let profileRow = null;
        try {
          const { data: pData } = await supabase
            .from("profiles")
            .select("*, members(*)")
            .eq("id", sessionUser.id)
            .maybeSingle();
          profileRow = pData;
        } catch (profileErr) {
          console.warn("Profile fetch after signin:", profileErr);
        }

        await hydrateUser(sessionUser, profileRow || null);
      }

      return data;
    },
    [hydrateUser]
  );

  const signUp = useCallback(
    async ({ email, password, fullName, phone }) => {
      const normalizedEmail = String(email || "").trim().toLowerCase();
      const normalizedPassword = String(password || "");
      const cleanName = String(fullName || "").trim();
      const cleanPhone = String(phone || "").trim();

      if (!cleanName || !normalizedEmail || !normalizedPassword) {
        throw new Error("Please fill in your name, email, and password.");
      }

      if (normalizedPassword.length < 6) {
        throw new Error("Password must be at least 6 characters long.");
      }

      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: normalizedPassword,
        options: {
          data: {
            full_name: cleanName,
            phone: cleanPhone,
            role: "member",
          },
        },
      });

      if (error) {
        throw error;
      }

      const sessionUser = data?.user;

      if (sessionUser && data.session) {
        let profileRow = null;
        try {
          const { data: pData } = await supabase
            .from("profiles")
            .select("*, members(*)")
            .eq("id", sessionUser.id)
            .maybeSingle();
          profileRow = pData;
        } catch (pErr) {
          console.warn("Profile fetch after signup:", pErr);
        }

        await hydrateUser(sessionUser, profileRow || {
          id: sessionUser.id,
          email: normalizedEmail,
          full_name: cleanName,
          phone: cleanPhone,
          role: "member",
          avatar_initials: cleanName.slice(0, 2).toUpperCase(),
        });
      }

      return data;
    },
    [hydrateUser]
  );

  const signOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      resetAuthState();
      return { error };
    } catch (err) {
      console.warn("Supabase signOut error:", err);
      resetAuthState();
      return { error: null };
    }
  }, [resetAuthState]);

  const value = useMemo(
    () => ({
      user,
      profile,
      role,
      loading,
      signInWithPassword,
      signUp,
      signOut,
    }),
    [user, profile, role, loading, signInWithPassword, signUp, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
