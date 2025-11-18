import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import CardNav from "@/components/ui/CardNav";
import logo from "@/assets/logo.svg";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/contexts/ThemeContext";
import { Moon, Sun } from "lucide-react";
import type { User } from "@supabase/supabase-js";

export default function Nav() {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [user, setUser] = useState<User | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [avatarSrc, setAvatarSrc] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState(false);
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [navigate]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      setUser(data?.user ?? null);

      // If there's a logged-in user, check whether they already have a profile.
      // If not, redirect them to the Profile page to complete onboarding.
      try {
        const u = data?.user;
        if (u) {
          const { data: profile } = await supabase
            .from("user_profiles")
            .select("id")
            .eq("user_id", u.id)
            .maybeSingle();
          if (!profile) {
            // only navigate if we're not already on the profile page
            if (window.location.pathname !== "/profile") {
              navigate("/profile?onboard=1");
            }
          }
        }
      } catch (err) {
        console.error("Error checking onboarding status:", err);
      }
    };
    load();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        // When auth state changes (e.g. sign in), check onboarding
        (async () => {
          const u = session?.user;
          if (!u) return;
          try {
            const { data: profile } = await supabase
              .from("user_profiles")
              .select("id")
              .eq("user_id", u.id)
              .maybeSingle();
            if (!profile) {
              if (window.location.pathname !== "/profile") {
                navigate("/profile?onboard=1");
              }
            }
          } catch (err) {
            console.error(
              "Error checking onboarding status after auth change:",
              err
            );
          }
        })();
      }
    );

    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  // derive avatar URL from user_profiles table, then metadata or identities
  useEffect(() => {
    setAvatarError(false);
    if (!user) {
      setAvatarSrc(null);
      return;
    }
    const fetchAvatar = async () => {
      try {
        // First try to get avatar and full_name from user_profiles table
        const { data: profile, error: profileErr } = await supabase
          .from("user_profiles")
          .select("avatar_url, full_name")
          .eq("user_id", user.id)
          .maybeSingle();

        if (profileErr) {
          console.error("Error fetching profile in Nav:", profileErr);
        }

        if (profile?.avatar_url) {
          setAvatarPath(profile.avatar_url);
          // get signed url for private bucket
          try {
            const objectPath = profile.avatar_url.startsWith("avatars/")
              ? profile.avatar_url.substring("avatars/".length)
              : profile.avatar_url;
            const { data } = await supabase.storage
              .from("avatars")
              .createSignedUrl(objectPath, 60 * 60);
            setAvatarSrc(data.signedUrl);
          } catch (e) {
            console.error("Failed to create signed URL for avatar in Nav", e);
            setAvatarSrc(null);
          }
        }

        if (profile?.full_name) {
          setFullName(profile.full_name);
        }

        // If we found a profile, stop here
        if (profile) return;
      } catch (err) {
        console.error("Error fetching profile:", err);
      }

      // Fallback to user metadata
      const meta = (user.user_metadata ?? {}) as Record<string, unknown>;

      // helper to pick first string url from candidates
      const pick = (...keys: string[]) => {
        for (const k of keys) {
          const v = meta[k];
          if (typeof v === "string" && v.length > 0) return v;
        }
        return null;
      };

      // check metadata common fields
      let src: string | null = pick(
        "avatar_url",
        "picture",
        "avatar",
        "photo_url"
      );

      // check identities (OAuth providers) for avatar in identity_data
      if (!src) {
        const identities = (
          user as unknown as { identities?: Array<Record<string, unknown>> }
        ).identities;
        if (Array.isArray(identities)) {
          for (const id of identities) {
            const idData = (id && (id.identity_data ?? {})) as Record<
              string,
              unknown
            >;
            if (typeof idData["avatar_url"] === "string") {
              src = idData["avatar_url"] as string;
              break;
            }
            if (typeof idData["picture"] === "string") {
              src = idData["picture"] as string;
              break;
            }
          }
        }
      }

      // final fallback: try user.user_metadata['avatar'] which might be an object with url
      if (!src && meta["avatar"] && typeof meta["avatar"] === "object") {
        const obj = meta["avatar"] as Record<string, unknown>;
        if (typeof obj["url"] === "string") src = obj["url"];
      }

      setAvatarSrc(src);
    };

    fetchAvatar();

    // Listen for profile updates emitted by the Profile page so the navbar reflects changes immediately
    const onProfileUpdated = async (e: Event) => {
      // Re-run the same logic to pick up new avatar
      await fetchAvatar();
    };
    window.addEventListener(
      "profile:updated",
      onProfileUpdated as EventListener
    );

    return () => {
      window.removeEventListener(
        "profile:updated",
        onProfileUpdated as EventListener
      );
    };
  }, [user]);

  const navigationLinks = [
    { href: "/events", label: "Events" },
    { href: "/community", label: "Community" },
    { href: "/about", label: "About" },
    { href: "/contact", label: "Contact" },
  ];

  const items = [
    {
      label: "Events",
      bgColor: "#0D0716",
      textColor: "#fff",
      links: [
        {
          label: "Hackathons",
          href: "/events/hackathons",
          ariaLabel: "View Hackathons",
        },
        {
          label: "Model UN",
          href: "/events/model-un",
          ariaLabel: "View Model UN Events",
        },
        {
          label: "Gaming Tournaments",
          href: "/events/gaming",
          ariaLabel: "View Gaming Tournaments",
        },
        {
          label: "Workshops",
          href: "/events/workshops",
          ariaLabel: "View Workshops",
        },
      ],
    },
    {
      label: "Company",
      bgColor: "#170D27",
      textColor: "#fff",
      links: [
        { label: "About Us", href: "/about", ariaLabel: "About Repdox" },
        { label: "Our Team", href: "/team", ariaLabel: "Meet Our Team" },
        { label: "Partners", href: "/partners", ariaLabel: "Our Partners" },
      ],
    },
    {
      label: "Contact",
      bgColor: "#271E37",
      textColor: "#fff",
      links: [
        { label: "Email", href: "/contact", ariaLabel: "Email us" },
        { label: "Discord", href: "#", ariaLabel: "Join Discord" },
        { label: "Instagram", href: "#", ariaLabel: "Follow on Instagram" },
      ],
    },
  ];

  // Mobile view: use CardNav
  if (isMobile) {
    return (
      <CardNav
        logo={logo}
        items={items}
        baseColor="#fff"
        menuColor="#000"
        buttonBgColor="#111"
        buttonTextColor="#fff"
        ease="power3.out"
      />
    );
  }

  // Desktop view
  return (
    <header className="bg-background/80 backdrop-blur-md border-b border-border/40 px-3 md:px-6 z-50 sticky top-0">
      <div className="flex h-16 items-center justify-between gap-4 max-w-7xl mx-auto">
        {/* Left side */}
        <div className="flex items-center gap-8">
          <Link
            to="/"
            className="text-primary hover:text-primary/90 flex-shrink-0 font-bold text-lg"
          >
            <img src={logo} alt="Repdox" className="h-8 w-auto" />
          </Link>
          <NavigationMenu>
            <NavigationMenuList className="gap-1">
              {navigationLinks.map((link, index) => (
                <NavigationMenuItem key={index}>
                  <NavigationMenuLink
                    href={link.href}
                    className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent/10 rounded-md transition-all duration-200"
                  >
                    {link.label}
                  </NavigationMenuLink>
                </NavigationMenuItem>
              ))}
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        {/* Right side - avatar or sign in */}
        <div className="flex items-center gap-3 flex-shrink-0 relative">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5 text-accent" />
            ) : (
              <Moon className="h-5 w-5 text-muted-foreground" />
            )}
          </button>

          {user ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen((s) => !s)}
                className="h-10 w-10 rounded-full overflow-hidden ring-2 ring-offset-2 ring-offset-background ring-transparent hover:ring-accent/40 transition"
                aria-label="Open user menu"
              >
                {avatarSrc && !avatarError ? (
                  <img
                    src={avatarSrc}
                    alt="avatar"
                    className="w-full h-full object-cover"
                    onError={() => setAvatarError(true)}
                  />
                ) : (
                  (() => {
                    const meta = (user.user_metadata ?? {}) as Record<
                      string,
                      unknown
                    >;
                    const name =
                      fullName ||
                      (typeof meta["full_name"] === "string"
                        ? (meta["full_name"] as string)
                        : user.email ?? "");
                    const initials = name
                      .split(" ")
                      .map((s) => s[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase();
                    return (
                      <div className="w-full h-full bg-accent flex items-center justify-center text-white font-semibold">
                        {initials || "U"}
                      </div>
                    );
                  })()
                )}
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-white rounded-md shadow-lg py-2 z-60">
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      navigate("/profile");
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Profile
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      navigate("/my-events");
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    My Events
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Button
              asChild
              variant="outline"
              size="sm"
              className="text-sm px-6 h-10 rounded-lg border-accent/50 hover:bg-accent/10 font-medium"
            >
              <Link to="/signin">Sign In</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
