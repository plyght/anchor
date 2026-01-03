const MAX_RETRIES = 10;
const INITIAL_DELAY = 1000;
const MAX_DELAY = 5000;
const VERIFICATION_DELAY = 2000;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pingBackend(healthUrl: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(healthUrl, {
      signal: controller.signal,
      method: 'GET',
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    return false;
  }
}

export async function wakeupBackend(
  apiUrl: string,
  onRetry?: (attempt: number, maxRetries: number) => void
): Promise<boolean> {
  const healthUrl = `${apiUrl}/health`;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    if (onRetry) {
      onRetry(attempt, MAX_RETRIES);
    }
    
    const firstPing = await pingBackend(healthUrl);
    
    if (firstPing) {
      console.log(`Backend responded on first ping (attempt ${attempt}/${MAX_RETRIES})`);
      
      await sleep(VERIFICATION_DELAY);
      
      const secondPing = await pingBackend(healthUrl);
      
      if (secondPing) {
        console.log(`Backend verified with second ping - fully awake!`);
        return true;
      } else {
        console.log(`Second ping failed, backend may still be waking up...`);
      }
    }
    
    if (attempt < MAX_RETRIES) {
      const delay = Math.min(INITIAL_DELAY * attempt, MAX_DELAY);
      console.log(`Backend not ready, retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRIES})...`);
      await sleep(delay);
    }
  }
  
  console.error(`Backend failed to wake up after ${MAX_RETRIES} attempts`);
  return false;
}
