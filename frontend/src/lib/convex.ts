import { ConvexReactClient } from "convex/react";

const convexUrl = import.meta.env.VITE_CONVEX_URL || "";

if (!convexUrl) {
  console.warn(
    "VITE_CONVEX_URL is not set. Please set it in your .env file. You can copy CONVEX_URL from .env.local"
  );
}

export const convex = new ConvexReactClient(convexUrl);
