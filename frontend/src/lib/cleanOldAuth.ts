export function cleanOldAuthState() {
  const convexUrl = import.meta.env.VITE_CONVEX_URL || '';
  const jwtKey = `__convexAuthJWT_${convexUrl.replace(/[^a-zA-Z0-9]/g, '')}`;
  const refreshKey = `__convexAuthRefreshToken_${convexUrl.replace(/[^a-zA-Z0-9]/g, '')}`;
  
  const hadOldAuth = localStorage.getItem(jwtKey) !== null || localStorage.getItem(refreshKey) !== null;
  
  if (hadOldAuth) {
    console.log('[Auth Cleanup] Removing old auth system tokens...');
    localStorage.removeItem(jwtKey);
    localStorage.removeItem(refreshKey);
    
    Object.keys(localStorage).forEach(key => {
      if (key.includes('convexAuth') || key.includes('__convex')) {
        localStorage.removeItem(key);
      }
    });
    
    console.log('[Auth Cleanup] Old tokens removed. Please sign in again with Better Auth.');
  }
  
  return hadOldAuth;
}
