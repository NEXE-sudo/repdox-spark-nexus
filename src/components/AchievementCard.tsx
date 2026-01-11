import { Achievement } from '@/lib/achievementService';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';

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
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <Card className={`overflow-hidden ${achievement.unlocked ? 'border-accent' : 'opacity-60'}`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className={`text-4xl ${achievement.unlocked ? 'grayscale-0' : 'grayscale'}`}>
              {achievement.icon}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-sm mb-1">{achievement.title}</h3>
              <p className="text-xs text-muted-foreground mb-2">
                {achievement.description}
              </p>
              {!achievement.unlocked && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">
                      {achievement.progress || 0} / {achievement.requirement}
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div
                      className="bg-accent h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                </div>
              )}
              {achievement.unlocked && (
                <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                  <span className="font-medium">Unlocked!</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}