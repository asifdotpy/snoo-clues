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
      heading: "Can you solve it?",
      description: "Analyze the evidence and close the Case File!",
      backgroundUri: "splash_bg_premium.png",
      appIconUri: "logo_premium_1024_pixel.png",
      buttonLabel: "Play Now",
    },
  });
};
