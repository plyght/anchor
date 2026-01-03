export function forceAuthCheck() {
  const convexUrl = import.meta.env.VITE_CONVEX_URL?.replace(/[^a-zA-Z0-9]/g, '');
  const jwtKey = `__convexAuthJWT_${convexUrl}`;
  const refreshKey = `__convexAuthRefreshToken_${convexUrl}`;
  
  const jwt = localStorage.getItem(jwtKey);
  const refresh = localStorage.getItem(refreshKey);
  
  console.log('[forceAuthCheck] JWT exists:', !!jwt);
  console.log('[forceAuthCheck] Refresh token exists:', !!refresh);
  
  if (jwt && refresh) {
    console.log('[forceAuthCheck] Tokens found, attempting to trigger re-authentication');
    window.dispatchEvent(new Event('storage'));
    return true;
  }
  
  return false;
}
