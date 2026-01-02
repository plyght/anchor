import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../convex/_generated/api.js';

const convexUrl = process.env.CONVEX_URL;
const deployKey = process.env.CONVEX_DEPLOY_KEY;

if (!convexUrl && !deployKey) {
  console.warn(
    '⚠️  CONVEX_URL or CONVEX_DEPLOY_KEY not set. Convex client will not be initialized.'
  );
}

// ConvexHttpClient accepts either a URL or a deploy key
// Deploy key format: "dev:project-name|key"
// URL format: "https://project-name.convex.cloud"
export const convex = convexUrl
  ? new ConvexHttpClient(convexUrl)
  : deployKey
  ? new ConvexHttpClient(deployKey)
  : null;

export { api };
