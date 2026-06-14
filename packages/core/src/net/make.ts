import { ComposeOutput } from "./compose"

export interface RouteEntry {
    entityName: string
    entityType: 'kv' | 'sqlite'
    method: string
}

export interface RouteMap {
    [routeId: string]: RouteEntry
}

export interface NamedRoutes {
    [name: string]: string
}

export interface NetState {
    routes: RouteMap
    namedRoutes: NamedRoutes
    entityNames: string[]
}

export interface NetDescriptor {
    state: NetState
    provide(): {
        with(ctx: { _aromix?: { routes: RouteMap; namedRoutes: NamedRoutes } }): void
    }
}

function generateRouteId(): string {
    return crypto.randomUUID()
}

const sqliteMethods = [
    'findById', 'findOne', 'findMany',
    'count', 'exist', 'insert', 'update', 'upsert',
    'delete', 'deleteById', 'paginate',
] as const

const kvMethods = [
    'get', 'set', 'delete', 'has',
] as const

export function make(input: ComposeOutput): NetDescriptor {
    const routes: RouteMap = {}
    const namedRoutes: NamedRoutes = {}

    for (const entity of input.sqlite) {
        for (const method of sqliteMethods) {
            const id = generateRouteId()
            routes[id] = { entityName: entity.state.name, entityType: 'sqlite', method }
            namedRoutes[`${entity.state.name}.${method}`] = id
        }
    }

    for (const entity of input.kv) {
        for (const method of kvMethods) {
            const id = generateRouteId()
            routes[id] = { entityName: entity.state.name, entityType: 'kv', method }
            namedRoutes[`${entity.state.name}.${method}`] = id
        }
    }

    const entityNames = [
        ...new Set([
            ...input.sqlite.map(e => e.state.name),
            ...input.kv.map(e => e.state.name),
        ]),
    ]

    const state: NetState = { routes, namedRoutes, entityNames }

    return {
        state,
        provide() {
            return {
                with(ctx) {
                    ctx._aromix = { routes, namedRoutes }
                },
            }
        },
    }
}
