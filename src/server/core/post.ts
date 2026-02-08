import { context, reddit } from "@devvit/web/server";

export const createPost = async () => {
  const { subredditName } = context;
  if (!subredditName) {
    throw new Error("subredditName is required");
  }

  return await reddit.submitCustomPost({
    subredditName: subredditName,
    title: "Snoo Clues!",
    entry: 'default',
    splash: {
      appDisplayName: "Snoo-Clues",
      backgroundUri: "splash_bg_premium.png",
      appIconUri: "logo_premium.png",
      buttonLabel: "Play Now",
      description: "Find the hidden clues and solve the mystery!",
    },
  });
};
