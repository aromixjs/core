export const resolve = (hookOrHandler, handler) => {
    if (Array.isArray(hookOrHandler)) {
        return { hooks: hookOrHandler, handler: handler };
    }
    else {
        return { hooks: [], handler: hookOrHandler };
    }
};
