import app from './app';
import { initSupabase } from './lib/supabase';

let initialized = false;

function hydrateProcessEnv(env: Record<string, string>) {
  const globalProcess: any = (globalThis as any).process || { env: {} };
  globalProcess.env = globalProcess.env || {};
  (globalThis as any).process = globalProcess;
  Object.assign(globalProcess.env, env);

  if (!initialized) {
    initSupabase(globalProcess.env);
    initialized = true;
  }
}

export default {
  fetch(request: Request, env: Record<string, string>, ctx: any) {
    hydrateProcessEnv(env);
    return app.fetch(request, env, ctx);
  },
};
