import type { Reward } from '@/src/components/RewardCelebration';
import { useAuth } from '@/src/context/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

type XpResponseFields = {
  xp_earned?: number;
  leveled_up?: boolean;
  new_level?: number | null;
  new_achievements?: Reward['newAchievements'];
};

/**
 * Any mutation whose API response can carry xp_earned/leveled_up/
 * new_level/new_achievements should call handleXpResponse(data) on
 * success. Without this, XP-earning actions only ever drove the one-shot
 * celebration toast — the shared user.xp/user.level (read by both Profile
 * and Awards) and the Awards screen's own tasks/achievements cache never
 * got told anything changed, so both stayed stale until an unrelated
 * pull-to-refresh happened to fire.
 */
export function useXpReward() {
  const { refreshUser } = useAuth();
  const qc = useQueryClient();
  const [reward, setReward] = useState<Reward | null>(null);

  const handleXpResponse = useCallback((data: XpResponseFields) => {
    if ((data.xp_earned ?? 0) <= 0) return;

    refreshUser().catch(() => {});
    qc.invalidateQueries({ queryKey: ['tasks'] });
    qc.invalidateQueries({ queryKey: ['leaderboard'] });
    qc.invalidateQueries({ queryKey: ['user-stats'] });

    setReward({
      xpEarned: data.xp_earned ?? 0,
      leveledUp: data.leveled_up,
      newLevel: data.new_level,
      newAchievements: data.new_achievements,
    });
  }, [refreshUser, qc]);

  return { reward, setReward, handleXpResponse };
}
