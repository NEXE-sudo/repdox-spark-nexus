import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function Nav() {
  return (
    <header className="bg-background border-b border-border/50">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Logo - text fallback if image not provided */}
          <Link to="/" className="text-xl font-bold tracking-tight">
            Repdox
          </Link>
          <nav className="hidden md:flex items-center gap-4 ml-6">
            <Link to="/events" className="text-sm text-muted-foreground hover:text-foreground">
              Events
            </Link>
            <Link to="/contact" className="text-sm text-muted-foreground hover:text-foreground">
              Contact
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/events">
            <Button variant="default" size="sm">View Events</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
