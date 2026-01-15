import { motion } from "framer-motion";
import { MessageCircle, Instagram, Twitter, Github, Mail, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const footerLinks = {
  events: [
    { label: "Hackathons", href: "/events?type=Hackathon" },
    { label: "Model UN", href: "/events?type=MUN" },
    { label: "Gaming Tournaments", href: "/events?type=Gaming" },
    { label: "Workshops", href: "/events?type=Workshop" },
  ],
  company: [
    { label: "About Us", href: "/about" },
    { label: "Contact", href: "/contact" },
    // { label: "Community", href: "/community" },
  ],
  resources: [
    { label: "Event Guidelines", href: "#" },
    { label: "FAQs", href: "#" },
    { label: "Support", href: "#" },
  ],
};

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden border-t border-border bg-background">
      {/* Animated background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.1),transparent_70%)]" />
      
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 mb-12">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h3 className="text-3xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">
                Repdox
              </h3>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Think. Build. Transform.<br />
                Empowering the next generation of innovators.
              </p>
              
              {/* Social Links */}
              <div className="flex gap-3">
                {[
                  { icon: MessageCircle, href: "https://discord.gg/tp3CM47tRM", label: "Discord", color: "from-indigo-500 to-blue-500" },
                  { icon: Instagram, href: "#", label: "Instagram", color: "from-pink-500 to-rose-500" },
                  { icon: Twitter, href: "#", label: "Twitter", color: "from-blue-400 to-cyan-400" },
                  { icon: Github, href: "#", label: "Github", color: "from-gray-400 to-gray-600" },
                ].map((social, index) => {
                  const Icon = social.icon;
                  return (
                    <motion.a
                      key={index}
                      href={social.href}
                       whileHover={{ y: -4, scale: 1.1 }}
                       whileTap={{ scale: 0.95 }}
                       className="group relative p-3 rounded-xl bg-accent/10 hover:bg-accent/20 border border-border transition-all"
                       aria-label={social.label}
                     >
                       <Icon className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                      <motion.div
                        className={`absolute inset-0 rounded-xl opacity-0 group-hover:opacity-20 bg-gradient-to-br ${social.color}`}
                        transition={{ duration: 0.3 }}
                      />
                    </motion.a>
                  );
                })}
              </div>
            </motion.div>
          </div>

          {/* Links Columns */}
          {Object.entries(footerLinks).map(([category, links], categoryIndex) => (
            <motion.div
              key={category}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: categoryIndex * 0.1 }}
            >
               <h4 className="font-semibold mb-4 text-foreground capitalize">
                 {category}
               </h4>
              <ul className="space-y-3">
                {links.map((link, linkIndex) => (
                  <motion.li
                    key={linkIndex}
                    whileHover={{ x: 4 }}
                    transition={{ duration: 0.2 }}
                  >
                     <Link
                       to={link.href}
                       className="group inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                     >
                       <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 -ml-5 group-hover:ml-0 transition-all" />
                       {link.label}
                     </Link>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Bottom Bar */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="pt-8 border-t border-white/10"
        >
           <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground/60">
             <p>© {currentYear} Repdox. All rights reserved.</p>
             <div className="flex gap-6">
               <Link to="#" className="hover:text-foreground transition-colors">
                 Privacy Policy
               </Link>
               <Link to="#" className="hover:text-foreground transition-colors">
                 Terms of Service
               </Link>
               <Link to="#" className="hover:text-foreground transition-colors">
                 Cookie Policy
               </Link>
             </div>
           </div>
        </motion.div>
      </div>
    </footer>
  );
}