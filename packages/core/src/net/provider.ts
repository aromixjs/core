export interface ProviderState {
    registered: boolean
    booted: boolean
}

export interface ProviderInput {
    register(): void
    boot?(): void
}

export interface ProviderOutput {
    state: ProviderState
    boot(): void
}

export function provider(input: ProviderInput): ProviderOutput {
    const state: ProviderState = {
        registered: false,
        booted: false,
    }

    input.register()
    state.registered = true

    return {
        state,
        boot() {
            if (input.boot) {
                input.boot()
            }
            state.booted = true
        },
    }
}
