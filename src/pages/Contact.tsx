import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import Footer from "@/components/Footer";

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // For now just clear and show a native alert — replace with Supabase/email service later
    alert('Message sent — we will reach out soon');
    setForm({ name: '', email: '', message: '' });
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-4xl mx-auto px-6 py-20">
        <h1 className="text-4xl font-bold mb-4">Get in touch</h1>
        <p className="text-muted-foreground mb-8">Have questions or want to partner with us? We'd love to hear from you.</p>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Your Name</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <Label htmlFor="email">Your Email</Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="message">Your Message</Label>
              <Textarea id="message" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={6} required />
            </div>
            <div className="md:col-span-2">
              <Button type="submit">Send Message</Button>
            </div>
          </div>

          <aside className="space-y-6">
            <div className="p-6 bg-card/80 rounded border border-border/50">
              <h3 className="font-semibold mb-2">Email Us</h3>
              <p className="text-muted-foreground">hello@repdox.com</p>
              <p className="text-muted-foreground">partnerships@repdox.com</p>
            </div>

            <div className="p-6 bg-card/80 rounded border border-border/50">
              <h3 className="font-semibold mb-2">Join Our Community</h3>
              <p className="text-muted-foreground mb-4">Connect with fellow event enthusiasts, get updates, and collaborate.</p>
              <a href="#" className="inline-block">
                <Button variant="outline">Join Discord</Button>
              </a>
            </div>
          </aside>
        </form>
      </main>

      <Footer />
    </div>
  );
}
