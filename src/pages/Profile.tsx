import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { uploadAvatar as uploadAvatarService, getAvatarSignedUrl } from '@/lib/profileService';
import type { User } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Mail, Save, Upload, LogOut, User as UserIcon, Briefcase, Phone, MapPin, Globe } from 'lucide-react';

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
  created_at: string;
  updated_at: string;
}

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeSection, setActiveSection] = useState('personal');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [fullName, setFullName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [website, setWebsite] = useState('');
  const [bio, setBio] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  // avatarPath stores the storage path (avatars/...) saved in DB
  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  // avatarUrl stores a temporary signed URL used for img src
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    const loadUserAndProfile = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        navigate('/signin');
        return;
      }

      setUser(userData.user);
      setAvatarUrl(deriveAvatarUrl(userData.user));

      // Fetch user profile from database
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userData.user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error fetching profile:', profileError);
      }

      if (profileData) {
        setProfile(profileData);
        setFullName(profileData.full_name || '');
        setJobTitle(profileData.job_title || '');
        setCompany(profileData.company || '');
        setPhone(profileData.phone || '');
        setLocation(profileData.location || '');
        setWebsite(profileData.website || '');
        setBio(profileData.bio || '');
        if (profileData.avatar_url) {
          // avatar_url in DB stores the storage path (avatars/xxx.jpg)
          setAvatarPath(profileData.avatar_url);
          try {
            const signed = await getAvatarSignedUrl(profileData.avatar_url, 60 * 60);
            setAvatarUrl(signed);
          } catch (err) {
            console.error('Failed to get signed URL for avatar:', err);
          }
        }
      }
    };

    loadUserAndProfile();
  }, [navigate]);

  const deriveAvatarUrl = (user: User): string | null => {
    const meta = (user.user_metadata ?? {}) as Record<string, unknown>;

    if (typeof meta['avatar_url'] === 'string') return meta['avatar_url'] as string;
    if (typeof meta['picture'] === 'string') return meta['picture'] as string;

    const identities = (user as unknown as { identities?: Array<Record<string, unknown>> }).identities;
    if (Array.isArray(identities)) {
      for (const id of identities) {
        const idData = (id && (id.identity_data ?? {})) as Record<string, unknown>;
        if (typeof idData['avatar_url'] === 'string') return idData['avatar_url'] as string;
        if (typeof idData['picture'] === 'string') return idData['picture'] as string;
      }
    }

    return null;
  };

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side enforce max 2MB
    const MAX_BYTES = 2 * 1024 * 1024;
    if (file.size > MAX_BYTES) {
      setError('File too large. Maximum allowed size is 2 MB');
      return;
    }

    setError(null);
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (evt) => {
      setAvatarPreview(evt.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const uploadAvatar = async (file: File): Promise<string | null> => {
    if (!user) return null;

    try {
      const ext = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${ext}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      return publicUrlData.publicUrl;
    } catch (err) {
      console.error('Avatar upload failed:', err);
      return null;
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      let newAvatarUrl = avatarUrl;

      // Upload avatar if selected
      if (avatarFile) {
        // uploadAvatarService returns storage path (avatars/..)
        const path = await uploadAvatarService(user.id, avatarFile);
        if (path) {
          newAvatarUrl = path; // store path into DB field
          setAvatarPath(path);
          try {
            const signed = await getAvatarSignedUrl(path, 60 * 60);
            setAvatarUrl(signed);
          } catch (err) {
            console.error('Failed to get signed URL after upload', err);
          }
        } else {
          throw new Error('Failed to upload avatar');
        }
      }

      // Prepare profile update data
      const profileUpdate = {
        full_name: fullName,
        job_title: jobTitle,
        company: company,
        phone: phone,
        location: location,
        website: website,
        bio: bio,
        // avatar_url stores storage path for private buckets
        avatar_url: newAvatarUrl,
        updated_at: new Date().toISOString()
      };

      // Update or insert profile
      if (profile) {
        // Update existing profile
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update(profileUpdate)
          .eq('user_id', user.id);

        if (updateError) throw updateError;
      } else {
        // Insert new profile
        const { error: insertError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: user.id,
            ...profileUpdate
          });

        if (insertError) throw insertError;
      }

      // Refetch profile
      const { data: updatedProfile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (updatedProfile) setProfile(updatedProfile);

      setSuccess('Profile updated successfully!');
      setAvatarFile(null);
      setAvatarPreview(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update profile';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const getInitials = () => {
    if (fullName) {
      return fullName
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
    }
    return user?.email?.[0].toUpperCase() || 'U';
  };

  if (!user) return null;

  const sections = [
    { id: 'personal', label: 'Personal Info', icon: UserIcon },
    { id: 'professional', label: 'Professional', icon: Briefcase },
    { id: 'contact', label: 'Contact', icon: Phone },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="flex h-screen">
        {/* Sidebar */}
        <aside className="w-72 bg-white border-r border-slate-200 flex flex-col">
          {/* Profile Header in Sidebar */}
          <div className="p-6 border-b border-slate-200">
            <div className="flex flex-col items-center">
              <div className="h-24 w-24 rounded-full overflow-hidden ring-4 ring-blue-100 flex items-center justify-center bg-blue-50 mb-4">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="preview" className="w-full h-full object-cover" />
                ) : avatarUrl ? (
                  <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-blue-500 flex items-center justify-center text-white text-2xl font-bold">
                    {getInitials()}
                  </div>
                )}
              </div>
              <h2 className="text-lg font-bold text-slate-900 text-center">{fullName || 'Your Name'}</h2>
              <p className="text-sm text-slate-500 text-center">{jobTitle || 'Your Title'}</p>
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
                        ? 'bg-blue-50 text-blue-600 font-medium'
                        : 'text-slate-600 hover:bg-slate-50'
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
          <div className="p-4 border-t border-slate-200">
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
                <h1 className="text-4xl font-bold text-slate-900 mb-2">Profile Settings</h1>
                <p className="text-slate-600">Manage your account information and preferences</p>
              </div>

              {/* Messages */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm"
                >
                  {error}
                </motion.div>
              )}
              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm"
                >
                  {success}
                </motion.div>
              )}

              {/* Content Sections */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
                {activeSection === 'personal' && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-slate-900 mb-6">Personal Information</h2>
                    
                    {/* Avatar Upload */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-3">Profile Picture</label>
                      <label className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg cursor-pointer hover:bg-blue-100 transition">
                        <Upload className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-600">Choose Image</span>
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
                      <label className="block text-sm font-medium text-slate-700 mb-2">Full Name</label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Enter your full name"
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                      />
                    </div>



                    {/* Bio */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Bio</label>
                      <textarea
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="Tell us about yourself..."
                        rows={4}
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition resize-none"
                      />
                    </div>
                  </div>
                )}

                {activeSection === 'professional' && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-slate-900 mb-6">Professional Details</h2>
                    
                    {/* Job Title */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Job Title</label>
                      <div className="relative">
                        <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                          type="text"
                          value={jobTitle}
                          onChange={(e) => setJobTitle(e.target.value)}
                          placeholder="e.g., Software Engineer, Designer"
                          className="w-full pl-11 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                        />
                      </div>
                    </div>

                    {/* Company */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Company</label>
                      <div className="relative">
                        <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                          type="text"
                          value={company}
                          onChange={(e) => setCompany(e.target.value)}
                          placeholder="Your company name"
                          className="w-full pl-11 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                        />
                      </div>
                    </div>

                    {/* Website */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Website</label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                          type="url"
                          value={website}
                          onChange={(e) => setWebsite(e.target.value)}
                          placeholder="https://yourwebsite.com"
                          className="w-full pl-11 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                        />
                      </div>
                    </div>
                  </div>
                )}



                {activeSection === 'contact' && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-slate-900 mb-6">Contact Information</h2>
                    
                    {/* Email (Read-only) */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                      <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-lg text-slate-600">
                        <Mail className="w-5 h-5" />
                        {user.email}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">Email cannot be changed</p>
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Phone</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+1 (555) 123-4567"
                          className="w-full pl-11 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                        />
                      </div>
                    </div>

                    {/* Location */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Location</label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                          type="text"
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          placeholder="City, Country"
                          className="w-full pl-11 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Save Button */}
                <div className="mt-8 pt-6 border-t border-slate-200">
                  <Button
                    onClick={handleSave}
                    disabled={isLoading}
                    className="w-full sm:w-auto gap-2 bg-blue-600 hover:bg-blue-700"
                  >
                    <Save className="w-4 h-4" />
                    {isLoading ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </main>
  );
}