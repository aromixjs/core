import { resolve } from "./util";
export function program(programConfig) {
    const meta = {
        programConfig,
        commands: [],
    };
    return {
        meta,
        command(name, hookOrHandler, handler) {
            meta.commands.push({
                name,
                ...resolve(hookOrHandler, handler)
            });
        },
    };
}
