import React, { useState, useEffect } from 'react';
import { 
  Linkedin, Github, Twitter, Instagram, Globe, 
  Briefcase, MapPin, Share2, Copy, Check, X, Phone
} from 'lucide-react';

export default function PublicProfile({ 
  userId, // Pass from route params
  supabase, // Your supabase client
  getAvatarSignedUrl // Your avatar service function
}) {
  const [profile, setProfile] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  useEffect(() => {
    if (userId) {
      loadProfile();
    }
  }, [userId]);

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      
      if (data) {
        setProfile(data);
        // Load avatar if exists
        if (data.avatar_url) {
          const url = await getAvatarSignedUrl(data.avatar_url);
          setAvatarUrl(url);
        }
      } else {
        setError('Profile not found');
      }
    } catch (err) {
      console.error('Error loading profile:', err);
      setError(err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${profile.full_name}'s Profile`,
          text: `Check out ${profile.full_name}'s profile!`,
          url: url
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          setShowShareModal(true);
        }
      }
    } else {
      setShowShareModal(true);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center max-w-md p-8">
          <div className="text-6xl mb-4">😕</div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Profile Not Found</h2>
          <p className="text-muted-foreground">
            {error || "This profile doesn't exist or may have been removed."}
          </p>
        </div>
      </div>
    );
  }

  const socialLinks = [
    { icon: Linkedin, url: profile.linkedin_url, label: 'LinkedIn', color: '#0A66C2' },
    { icon: Github, url: profile.github_url, label: 'GitHub', color: '#181717' },
    { icon: Twitter, url: profile.twitter_url, label: 'Twitter', color: '#1DA1F2' },
    { icon: Instagram, url: profile.instagram_url, label: 'Instagram', color: '#E4405F' },
    { icon: Globe, url: profile.portfolio_url, label: 'Portfolio', color: 'hsl(var(--accent))' }
  ].filter(link => link.url);

  return (
    <div className="min-h-screen bg-background">
      {/* Header Gradient */}
      <div className="h-48 bg-gradient-to-br from-accent/20 to-accent/5"></div>

      {/* Share Button */}
      <button
        onClick={handleShare}
        className="fixed top-4 right-4 z-10 bg-card border border-border rounded-full w-12 h-12 flex items-center justify-center shadow-lg hover:bg-accent/10 transition"
      >
        <Share2 size={20} className="text-foreground" />
      </button>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 -mt-24 relative z-0">
        <div className="bg-card rounded-2xl shadow-xl border border-border overflow-hidden">
          {/* Profile Header */}
          <div className="p-8 text-center bg-gradient-to-b from-accent/5 to-transparent">
            <div className="inline-block mb-4">
              {avatarUrl ? (
                <img 
                  src={avatarUrl}
                  alt={profile.full_name}
                  className="w-32 h-32 rounded-full border-4 border-card shadow-lg object-cover"
                />
              ) : (
                <div className="w-32 h-32 rounded-full border-4 border-card shadow-lg bg-accent flex items-center justify-center text-accent-foreground text-4xl font-bold">
                  {profile.full_name?.charAt(0) || '?'}
                </div>
              )}
            </div>
            
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {profile.full_name}
            </h1>
            
            {profile.handle && (
              <p className="text-accent font-medium mb-4">@{profile.handle}</p>
            )}
            
            {profile.bio && (
              <p className="text-muted-foreground max-w-md mx-auto leading-relaxed">
                {profile.bio}
              </p>
            )}
          </div>

          {/* Professional Info */}
          {(profile.job_title || profile.location) && (
            <div className="px-8 py-6 border-t border-border">
              {profile.job_title && (
                <div className="flex items-center gap-3 mb-3">
                  <Briefcase size={18} className="text-accent" />
                  <span className="text-foreground">
                    {profile.job_title}
                    {profile.company && ` at ${profile.company}`}
                  </span>
                </div>
              )}
              
              {profile.location && (
                <div className="flex items-center gap-3">
                  <MapPin size={18} className="text-accent" />
                  <span className="text-foreground">{profile.location}</span>
                </div>
              )}
            </div>
          )}

          {/* Contact */}
          {(profile.phone || profile.website) && (
            <div className="px-8 py-6 border-t border-border">
              <h3 className="font-semibold text-foreground mb-4">Contact</h3>
              <div className="grid grid-cols-2 gap-3">
                {profile.phone && (
                  <a
                    href={`tel:${profile.phone}`}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-accent/5 border border-accent/20 rounded-lg hover:bg-accent/10 transition text-foreground"
                  >
                    <Phone size={18} />
                    <span className="text-sm font-medium">Call</span>
                  </a>
                )}
                {profile.website && (
                  <a
                    href={profile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-accent/5 border border-accent/20 rounded-lg hover:bg-accent/10 transition text-foreground"
                  >
                    <Globe size={18} />
                    <span className="text-sm font-medium">Website</span>
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Social Links */}
          {socialLinks.length > 0 && (
            <div className="px-8 py-6 border-t border-border">
              <h3 className="font-semibold text-foreground mb-4">Connect</h3>
              <div className="grid grid-cols-5 gap-4">
                {socialLinks.map((social, index) => {
                  const Icon = social.icon;
                  return (
                    <a
                      key={index}
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center gap-2 p-4 bg-background border border-border rounded-xl hover:border-accent hover:bg-accent/5 transition group"
                      title={social.label}
                    >
                      <Icon size={24} className="text-muted-foreground group-hover:text-accent transition" />
                      <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition">
                        {social.label}
                      </span>
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="px-8 py-6 border-t border-border text-center">
            <p className="text-sm text-muted-foreground">
              Shared via Digital Profile Card
            </p>
          </div>
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowShareModal(false)}
        >
          <div 
            className="bg-card border border-border rounded-xl p-6 max-w-md w-full relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowShareModal(false)}
              className="absolute top-4 right-4 p-2 rounded-lg hover:bg-muted transition"
            >
              <X size={20} />
            </button>
            
            <h3 className="text-xl font-semibold text-foreground mb-4">
              Share Profile
            </h3>
            
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={window.location.href}
                readOnly
                className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm font-mono"
              />
              <button
                onClick={() => copyToClipboard(window.location.href)}
                className="px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition"
              >
                {copied ? <Check size={18} /> : <Copy size={18} />}
              </button>
            </div>
            
            {copied && (
              <p className="text-sm text-green-600 dark:text-green-400">
                Link copied to clipboard!
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}