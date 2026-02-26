(function (root) {
    class ProgressionEngine {
        constructor(challenges) {
            this.challenges = Array.isArray(challenges) ? challenges : [];
            this.challengeById = new Map(this.challenges.map((challenge) => [challenge.id, challenge]));
            this.sorted = [...this.challenges].sort((a, b) => a.tier - b.tier || a.id.localeCompare(b.id));
        }

        getChallenge(challengeId) {
            return this.challengeById.get(challengeId) || null;
        }

        getChallengesByTier() {
            const grouped = { 1: [], 2: [], 3: [] };
            this.sorted.forEach((challenge) => {
                if (!grouped[challenge.tier]) {
                    grouped[challenge.tier] = [];
                }
                grouped[challenge.tier].push(challenge);
            });
            return grouped;
        }

        getFirstChallengeId() {
            return this.sorted.length > 0 ? this.sorted[0].id : null;
        }

        getNextChallengeId(challengeId) {
            const index = this.sorted.findIndex((challenge) => challenge.id === challengeId);
            if (index === -1 || index + 1 >= this.sorted.length) {
                return null;
            }
            return this.sorted[index + 1].id;
        }

        calculateStars(score, passScore) {
            const normalizedScore = Math.max(0, Math.min(100, Math.round(score)));
            if (normalizedScore < passScore) {
                return 0;
            }
            if (normalizedScore >= 95 || normalizedScore >= passScore + 20) {
                return 3;
            }
            if (normalizedScore >= passScore + 10) {
                return 2;
            }
            return 1;
        }

        isTierCompleted(campaign, tier) {
            const tierChallenges = this.sorted.filter((challenge) => challenge.tier === tier);
            if (tierChallenges.length === 0) {
                return false;
            }
            return tierChallenges.every((challenge) => {
                const entry = campaign.completedExperiments[challenge.id];
                return entry && entry.passed;
            });
        }

        resolveUnlocks(campaign, challengeId, passed) {
            if (!passed) {
                return [];
            }

            const challenge = this.getChallenge(challengeId);
            if (!challenge) {
                return [];
            }

            const unlocks = [];
            const rewardUnlocks = challenge.unlockRewards && Array.isArray(challenge.unlockRewards.unlocks)
                ? challenge.unlockRewards.unlocks
                : [];

            rewardUnlocks.forEach((unlockId) => {
                if (!campaign.unlockedExperiments.includes(unlockId)) {
                    unlocks.push(unlockId);
                }
            });

            const nextId = this.getNextChallengeId(challengeId);
            if (nextId && !campaign.unlockedExperiments.includes(nextId) && !unlocks.includes(nextId)) {
                unlocks.push(nextId);
            }

            const nextTier = challenge.tier + 1;
            if (this.isTierCompleted(campaign, challenge.tier)) {
                const tierChallenges = this.sorted.filter((entry) => entry.tier === nextTier);
                if (tierChallenges.length > 0) {
                    const firstNextTier = tierChallenges[0].id;
                    if (!campaign.unlockedExperiments.includes(firstNextTier) && !unlocks.includes(firstNextTier)) {
                        unlocks.push(firstNextTier);
                    }
                }
            }

            return unlocks;
        }

        getCampaignSummary(campaign) {
            const totalExperiments = this.sorted.length;
            const completedExperiments = Object.keys(campaign.completedExperiments || {}).length;
            const totalStars = this.sorted.reduce((sum, challenge) => {
                return sum + (campaign.starsByExperiment[challenge.id] || 0);
            }, 0);
            const maxStars = totalExperiments * 3;

            return {
                totalExperiments,
                completedExperiments,
                totalStars,
                maxStars,
                completionRatio: totalExperiments === 0 ? 0 : completedExperiments / totalExperiments
            };
        }

        buildTierProgress(campaign) {
            const tiers = this.getChallengesByTier();
            return Object.keys(tiers).map((key) => {
                const tier = Number(key);
                const challenges = tiers[tier] || [];
                const completed = challenges.filter((challenge) => {
                    const entry = campaign.completedExperiments[challenge.id];
                    return entry && entry.passed;
                }).length;

                return {
                    tier,
                    total: challenges.length,
                    completed,
                    progress: challenges.length === 0 ? 0 : completed / challenges.length
                };
            });
        }
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { ProgressionEngine };
    }

    root.ProgressionEngine = ProgressionEngine;
})(typeof window !== 'undefined' ? window : globalThis);
