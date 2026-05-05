import { ResolvedApp } from "@aromix/core";
import { toFetchHandler } from "@aromix/core";

export function serve(app: ResolvedApp) {
    const handler = toFetchHandler(app);

    let ready = false;

    async function runReadyOnce() {
        if (!ready) {
            ready = true;
            for (const fn of app.onReady) {
                await fn();
            }
        }
    }

    return {
        async fetch(req: Request): Promise<Response> {
            await runReadyOnce();
            return handler(req);
        }
    };
}