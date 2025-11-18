import { useEffect, useState } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import {
  uploadAvatar as uploadAvatarService,
  getAvatarSignedUrl,
  deleteUserAccount,
} from "@/lib/profileService";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import {
  Mail,
  Save,
  Upload,
  LogOut,
  User as UserIcon,
  Briefcase,
  Phone,
  MapPin,
  Globe,
  Calendar,
} from "lucide-react";

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  phone: string | null;
  location: string | null;
  website: string | null;
  company: string | null;
  job_title: string | null;
  "Date of Birth"?: string | null;
  created_at: string;
  updated_at: string;
}

const sections = [
  { id: "personal", label: "Personal Info", icon: UserIcon },
  { id: "professional", label: "Professional", icon: Briefcase },
  { id: "contact", label: "Contact", icon: Phone },
  { id: "security", label: "Security", icon: UserIcon }, // Add this line
];

export default function Profile() {
  const navigate = useNavigate();
  const location = useLocation();
  const { userId } = useParams();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeSection, setActiveSection] = useState("personal");

  // Form states
  const [fullName, setFullName] = useState("");
  const [handle, setHandle] = useState("");
  const [bio, setBio] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [website, setWebsite] = useState("");
  const [phone, setPhone] = useState("");
  const [locationInput, setLocationInput] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState<string>("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Avatar states
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // UI states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load user and profile on mount
  useEffect(() => {
    loadUserProfile();
  }, []);

  // Also update the useEffect that loads the avatar URL:
  useEffect(() => {
    if (profile?.avatar_url) {
      console.log("[Profile] Loading avatar from path:", profile.avatar_url);

      // The getAvatarSignedUrl function will clean the path
      getAvatarSignedUrl(profile.avatar_url)
        .then((url) => {
          console.log("[Profile] Avatar URL loaded:", url);
          setAvatarUrl(url);
        })
        .catch((err) => {
          console.error("[Profile] Error loading avatar:", err);
          setAvatarUrl(null);
        });
    } else {
      setAvatarUrl(null);
    }
  }, [profile?.avatar_url]);

  const loadUserProfile = async () => {
    try {
      const {
        data: { user: currentUser },
        error: userError,
      } = await supabase.auth.getUser();

      // If a userId param is present, load that profile for viewing (public view)
      if (userId) {
        // try to load profile by param
        const { data: profileData, error: profileError } = await supabase
          .from("user_profiles")
          .select("*")
          .eq("user_id", userId)
          .single();

        if (profileError && profileError.code !== "PGRST116") {
          throw profileError;
        }

        if (profileData) {
          setProfile(profileData);
        }

        // set current user if available (not required to view another profile)
        if (!userError && currentUser) setUser(currentUser);
        return;
      }

      if (userError) throw userError;
      if (!currentUser) {
        navigate("/login");
        return;
      }

      setUser(currentUser);

      const { data: profileData, error: profileError } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", currentUser.id)
        .single();

      if (profileError && profileError.code !== "PGRST116") {
        throw profileError;
      }

      if (profileData) {
        setProfile(profileData);
        setFullName(profileData.full_name || "");
        setHandle(profileData.handle || "");
        setBio(profileData.bio || "");
        setJobTitle(profileData.job_title || "");
        setCompany(profileData.company || "");
        setWebsite(profileData.website || "");
        setPhone(profileData.phone || "");
        setLocationInput(profileData.location || "");
        setDateOfBirth(profileData["Date of Birth"] || "");
      }
    } catch (err) {
      console.error("Error loading profile:", err);
      setError("Failed to load profile data");
    }
  };

  const loadAvatarUrl = async (path: string) => {
    try {
      const url = await getAvatarSignedUrl(path);
      setAvatarUrl(url);
    } catch (err) {
      console.error("Error loading avatar:", err);
    }
  };

  const getInitials = () => {
    if (fullName) {
      return fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
  };

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      let avatarPath = profile?.avatar_url;

      // Upload avatar if a new one is selected
      if (avatarFile) {
        console.log("[Profile] Uploading new avatar...");

        // uploadAvatar returns the path WITHOUT bucket name
        // e.g., "user-id/avatar-123.jpg" NOT "avatars/user-id/avatar-123.jpg"
        avatarPath = await uploadAvatarService(user.id, avatarFile);

        console.log("[Profile] Avatar uploaded, path:", avatarPath);

        // IMPORTANT: Do NOT add 'avatars/' prefix here!
        // The path should be: user-id/avatar-123.jpg
        // NOT: avatars/user-id/avatar-123.jpg
      }

      console.log("[Profile] Saving profile with avatar path:", avatarPath);

      // Upsert profile data
      const { error: upsertError } = await supabase
        .from("user_profiles")
        .upsert(
          {
            user_id: user.id,
            full_name: fullName || null,
            handle: handle || null,
            bio: bio || null,
            job_title: jobTitle || null,
            company: company || null,
            website: website || null,
            phone: phone || null,
            location: locationInput || null,
            "Date of Birth": dateOfBirth || null,
            avatar_url: avatarPath, // This should be: user-id/avatar-123.jpg
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id",
          }
        );

      if (upsertError) throw upsertError;

      setSuccess("Profile updated successfully!");
      setAvatarFile(null);
      setAvatarPreview(null);

      // Reload profile data
      await loadUserProfile();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      console.error("Error saving profile:", err);
      const message =
        err instanceof Error ? err.message : "Failed to save profile";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate("/login");
    } catch (err) {
      console.error("Error signing out:", err);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    try {
      await deleteUserAccount();
      navigate("/");
    } catch (err: any) {
      console.error("Error deleting account:", err);
      setError(err.message || "Failed to delete account");
    } finally {
      setDeleteLoading(false);
      setDeleteDialogOpen(false);
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="flex h-screen">
        {/* Sidebar */}
        <aside className="w-72 bg-card border-r border-border flex flex-col">
          {/* Profile Header in Sidebar */}
          <div className="p-6 border-b border-border">
            <div className="flex flex-col items-center">
              <div className="h-24 w-24 rounded-full overflow-hidden ring-4 ring-accent/20 flex items-center justify-center bg-accent/10 mb-4">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="preview"
                    className="w-full h-full object-cover"
                  />
                ) : avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-accent flex items-center justify-center text-accent-foreground text-2xl font-bold">
                    {getInitials()}
                  </div>
                )}
              </div>
              <h2 className="text-lg font-bold text-foreground text-center">
                {fullName || "Your Name"}
              </h2>
              <p className="text-sm text-muted-foreground text-center">
                {jobTitle || "Your Title"}
              </p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4">
            <div className="space-y-1">
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                      activeSection === section.id
                        ? "bg-accent/10 text-accent font-medium"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {section.label}
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Logout Button */}
          <div className="p-4 border-t border-border">
            <Button
              onClick={handleSignOut}
              variant="outline"
              className="w-full gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {/* Header */}
              <div className="mb-8">
                <h1 className="text-4xl font-bold text-foreground mb-2">
                  Profile Settings
                </h1>
                <p className="text-muted-foreground">
                  Manage your account information and preferences
                </p>
              </div>

              {/* Messages */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm"
                >
                  {error}
                </motion.div>
              )}
              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-green-700 dark:text-green-400 text-sm"
                >
                  {success}
                </motion.div>
              )}

              {/* Content Sections */}
              <div className="bg-card rounded-xl shadow-sm border border-border p-8">
                {activeSection === "personal" && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-foreground mb-6">
                      Personal Information
                    </h2>

                    {/* Avatar Upload */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-3">
                        Profile Picture
                      </label>
                      <label className="inline-flex items-center gap-2 px-4 py-2 bg-accent/10 border border-accent/30 rounded-lg cursor-pointer hover:bg-accent/20 transition">
                        <Upload className="w-4 h-4 text-accent" />
                        <span className="text-sm font-medium text-accent">
                          Choose Image
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarSelect}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {/* Full Name */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Enter your full name"
                        className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition"
                      />
                    </div>

                    {/* Handle (Twitter-style @handle) */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        @Handle (like @twitter)
                      </label>
                      <div className="flex items-center">
                        <span className="px-4 py-3 bg-muted border border-r-0 border-border rounded-l-lg text-muted-foreground">
                          @
                        </span>
                        <input
                          type="text"
                          value={handle}
                          onChange={(e) =>
                            setHandle(e.target.value.replace(/\s+/g, ""))
                          }
                          placeholder="your_handle"
                          className="flex-1 px-4 py-3 border border-border rounded-r-lg bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        This is required to post in the community. Keep it
                        unique and memorable.
                      </p>
                    </div>

                    {/* Date of Birth */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Date of Birth
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
                        <input
                          type="date"
                          value={dateOfBirth}
                          onChange={(e) => setDateOfBirth(e.target.value)}
                          className="w-full pl-11 pr-4 py-3 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition"
                        />
                      </div>
                    </div>

                    {/* Bio */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Bio
                      </label>
                      <textarea
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="Tell us about yourself..."
                        rows={4}
                        className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition resize-none"
                      />
                    </div>
                  </div>
                )}

                {activeSection === "professional" && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-foreground mb-6">
                      Professional Details
                    </h2>

                    {/* Job Title */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Job Title
                      </label>
                      <div className="relative">
                        <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <input
                          type="text"
                          value={jobTitle}
                          onChange={(e) => setJobTitle(e.target.value)}
                          placeholder="e.g., Software Engineer, Designer"
                          className="w-full pl-11 pr-4 py-3 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition"
                        />
                      </div>
                    </div>

                    {/* Company */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Company
                      </label>
                      <div className="relative">
                        <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <input
                          type="text"
                          value={company}
                          onChange={(e) => setCompany(e.target.value)}
                          placeholder="Your company name"
                          className="w-full pl-11 pr-4 py-3 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition"
                        />
                      </div>
                    </div>

                    {/* Website */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Website
                      </label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <input
                          type="url"
                          value={website}
                          onChange={(e) => setWebsite(e.target.value)}
                          placeholder="https://yourwebsite.com"
                          className="w-full pl-11 pr-4 py-3 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {activeSection === "contact" && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-foreground mb-6">
                      Contact Information
                    </h2>

                    {/* Email (Read-only) */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Email
                      </label>
                      <div className="flex items-center gap-3 px-4 py-3 bg-muted rounded-lg text-muted-foreground">
                        <Mail className="w-5 h-5" />
                        {user.email}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Email cannot be changed
                      </p>
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Phone
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+1 (555) 123-4567"
                          className="w-full pl-11 pr-4 py-3 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition"
                        />
                      </div>
                    </div>

                    {/* Location */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Location
                      </label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <input
                          type="text"
                          value={locationInput}
                          onChange={(e) => setLocationInput(e.target.value)}
                          placeholder="City, Country"
                          className="w-full pl-11 pr-4 py-3 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {activeSection === "security" && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-foreground mb-6">
                      Security & Privacy
                    </h2>

                    {/* Danger Zone */}
                    <div className="border border-destructive/30 rounded-lg p-6 bg-destructive/5">
                      <h3 className="text-lg font-semibold text-destructive mb-2">
                        Danger Zone
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Once you delete your account, there is no going back.
                        Please be certain.
                      </p>

                      <div className="space-y-3">
                        <div className="text-sm text-muted-foreground">
                          <p className="mb-2">This will permanently delete:</p>
                          <ul className="list-disc list-inside space-y-1 ml-2">
                            <li>Your profile and personal information</li>
                            <li>All events you've created</li>
                            <li>Your event registrations</li>
                            <li>Your avatar and uploaded files</li>
                            <li>All associated data</li>
                          </ul>
                        </div>

                        <Button
                          variant="destructive"
                          onClick={() => setDeleteDialogOpen(true)}
                          className="w-full sm:w-auto"
                        >
                          Delete My Account
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Save Button */}
                <div className="mt-8 pt-6 border-t border-border">
                  <Button
                    onClick={handleSave}
                    disabled={isLoading}
                    className="w-full sm:w-auto gap-2 bg-accent hover:bg-accent/90"
                  >
                    <Save className="w-4 h-4" />
                    {isLoading ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Delete Account Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your
              account, all your events, registrations, and remove all your data
              from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={deleteLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLoading ? "Deleting..." : "Yes, Delete My Account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
