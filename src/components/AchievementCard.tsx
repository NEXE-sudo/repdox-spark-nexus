import { Achievement } from '@/lib/achievementService';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { CheckCircle2, Lock } from 'lucide-react';

interface AchievementCardProps {
  achievement: Achievement;
}

export default function AchievementCard({ achievement }: AchievementCardProps) {
  const progressPercentage = Math.min(
    ((achievement.progress || 0) / achievement.requirement) * 100,
    100
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className="h-full"
    >
      <Card 
        className={`
          relative h-full overflow-hidden border transition-all duration-300
          ${achievement.unlocked 
            ? 'border-accent/50 bg-gradient-to-br from-card to-accent/5 shadow-sm hover:border-accent hover:shadow-md dark:from-card dark:to-accent/10' 
            : 'border-border/50 bg-muted/30 dark:bg-muted/10 hover:bg-muted/50 hover:border-border'
          }
        `}
      >
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            {/* Icon Container */}
            <div 
              className={`
                relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl transition-all duration-300 shadow-sm
                ${achievement.unlocked 
                  ? 'bg-accent/10 text-accent ring-1 ring-accent/20' 
                  : 'bg-muted text-muted-foreground grayscale'
                }
              `}
            >
              {achievement.icon}
              
              {/* Status Indicator Badge */}
              <div className={`absolute -bottom-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full ring-2 ring-background ${achievement.unlocked ? 'bg-accent text-accent-foreground' : 'bg-muted-foreground/30 text-muted-foreground'}`}>
                {achievement.unlocked ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : (
                  <Lock className="h-3 w-3" />
                )}
              </div>
            </div>

            <div className="flex-1 space-y-1">
              <div className="flex items-start justify-between gap-2">
                <h3 className={`font-semibold leading-tight tracking-tight ${achievement.unlocked ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {achievement.title}
                </h3>
              </div>
              
              <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                {achievement.description}
              </p>

              {/* Progress Section */}
              <div className="pt-3">
                {!achievement.unlocked ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground font-medium">Progress</span>
                      <span className="font-mono font-medium text-foreground/80">
                        {achievement.progress || 0} / {achievement.requirement}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-secondary/50 dark:bg-secondary/30">
                      <motion.div
                        className="h-full rounded-full bg-accent"
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPercentage}%` }}
                        transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs font-medium text-accent">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
                    Unlocked
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}