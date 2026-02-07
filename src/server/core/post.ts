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
      appDisplayName: "Snoo Clues",
      backgroundUri: "splash-bg.png",
      appIconUri: "logo.png",
      buttonLabel: "Play Now",
      description: "Find the hidden clues and solve the mystery!",
    },
  });
};
