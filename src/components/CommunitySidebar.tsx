import { useNavigate } from "react-router-dom";
import {
  Home,
  Compass,
  Bell,
  Mail,
  Bookmark,
  Users,
} from "lucide-react";

interface CommunitySidebarProps {
  activePath: "/community" | "/explore" | "/notifications" | "/messages" | "/bookmarks" | "/groups";
}

export function CommunitySidebar({ activePath }: CommunitySidebarProps) {
  const navigate = useNavigate();

  const menuItems = [
    { label: "Home", path: "/community", icon: Home },
    { label: "Explore", path: "/explore", icon: Compass },
    { label: "Notifications", path: "/notifications", icon: Bell },
    { label: "Messages", path: "/messages", icon: Mail },
    { label: "Bookmarks", path: "/bookmarks", icon: Bookmark },
    { label: "Groups", path: "/groups", icon: Users },
  ];

  return (
    <aside className="w-64 border-r border-border p-4 hidden lg:flex flex-col sticky top-0 h-full overflow-y-auto">
      <nav className="space-y-2 flex-1">
        {menuItems.map((item) => {
          const isActive = activePath === item.path;
          return (
            <div
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex items-center gap-4 p-3 rounded-full transition cursor-pointer ${
                isActive
                  ? "bg-purple-100 dark:bg-purple-900/20"
                  : "hover:bg-accent/10 active:scale-95"
              }`}
            >
              <item.icon
                className={`w-6 h-6 ${
                  isActive
                    ? "text-purple-600 dark:text-purple-400"
                    : "text-foreground"
                }`}
              />
              <span
                className={`text-xl ${
                  isActive
                    ? "font-bold text-purple-600 dark:text-purple-400"
                    : "text-foreground"
                }`}
              >
                {item.label}
              </span>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
