export function filter(hooks, on) {
    return hooks
        .filter((h) => h.on === on)
        .map((h) => h.run);
}
