import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Search, Home, Compass, Plus, User, MessageCircle, Bookmark, Calendar } from 'lucide-react';

interface Command {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  keywords?: string[];
}

export default function CommandPalette() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const commands: Command[] = [
    {
      id: 'home',
      label: 'Go to Home',
      icon: Home,
      action: () => navigate('/'),
      keywords: ['home', 'index']
    },
    {
      id: 'events',
      label: 'Browse Events',
      icon: Calendar,
      action: () => navigate('/events'),
      keywords: ['events', 'browse']
    },
    {
      id: 'create-event',
      label: 'Create Event',
      icon: Plus,
      action: () => navigate('/events/new'),
      keywords: ['create', 'new', 'event']
    },
    {
      id: 'my-events',
      label: 'My Events',
      icon: Calendar,
      action: () => navigate('/my-events'),
      keywords: ['my', 'events']
    },
    {
      id: 'community',
      label: 'Community Feed',
      icon: MessageCircle,
      action: () => navigate('/community'),
      keywords: ['community', 'feed', 'posts']
    },
    {
      id: 'create-post',
      label: 'Create Post',
      icon: Plus,
      action: () => navigate('/community'),
      keywords: ['create', 'post', 'new']
    },
    {
      id: 'explore',
      label: 'Explore',
      icon: Compass,
      action: () => navigate('/explore'),
      keywords: ['explore', 'discover']
    },
    {
      id: 'profile',
      label: 'My Profile',
      icon: User,
      action: () => navigate('/profile'),
      keywords: ['profile', 'settings', 'account']
    },
    {
      id: 'bookmarks',
      label: 'Bookmarks',
      icon: Bookmark,
      action: () => navigate('/bookmarks'),
      keywords: ['bookmarks', 'saved']
    }
  ];

  const filteredCommands = search
    ? commands.filter((cmd) =>
        [cmd.label, ...(cmd.keywords || [])].some((text) =>
          text.toLowerCase().includes(search.toLowerCase())
        )
      )
    : commands;

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setOpen((prev) => !prev);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const executeCommand = (cmd: Command) => {
    cmd.action();
    setOpen(false);
    setSearch('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="p-0 max-w-2xl">
        <div className="flex items-center border-b border-border px-4 py-3">
          <Search className="w-5 h-5 text-muted-foreground mr-3" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Type a command or search..."
            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            autoFocus
          />
        </div>

        <div className="max-h-96 overflow-y-auto p-2">
          {filteredCommands.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No commands found
            </div>
          ) : (
            filteredCommands.map((cmd) => {
              const Icon = cmd.icon;
              return (
                <button
                  key={cmd.id}
                  onClick={() => executeCommand(cmd)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-accent/10 transition text-left"
                >
                  <Icon className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm font-medium">{cmd.label}</span>
                </button>
              );
            })
          )}
        </div>

        <div className="border-t border-border px-4 py-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>Navigate with ↑ ↓</span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-2 py-1 bg-muted rounded">↵</kbd> to select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-2 py-1 bg-muted rounded">esc</kbd> to close
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}