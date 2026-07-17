```ts
// ============================================================
// CONFIG
// ============================================================

// config.ts — one file, static object or factory function
export default {
    db: {
        uri: env('MONGO_URI'),
        dbName: env('MONGO_DB', 'myapp'),
        poolSize: 10,
    },
    queue: { redis: env('REDIS_URL'), concurrency: 20 },
    auth: { secret: env('JWT_SECRET'), expires: '7d' },
    server: { port: 3000 },
}

// factory form — when values depend on each other
export default () => {
    const dbName = env('MONGO_DB', 'myapp')
    return {
        db: { uri: env('MONGO_URI'), dbName },
        cache: { prefix: `${dbName}:cache` },
    }
}

// env() — reads env var, throws if missing and no fallback
env('MONGO_URI') // throws if not set
env('PORT', '3000') // fallback if not set

// config() — access anywhere after serve() starts
import { config } from 'aromix'
config('db.uri') // 'mongodb://...'
config('db') // { uri, dbName, poolSize }
config('auth.secret') // '...'

// ============================================================
// PLUGIN
// ============================================================

// defining a plugin
export const myPlugin = plugin((app) => {
    // runs at registration time
    // app is the full app instance
})

// plugin that extends app with new methods
// step 1 — augment the type (in @aromix/mongo)
declare module 'aromix' {
    interface App {
        model(definition: ModelDefinition): void
        job(definition: JobDefinition): void
        task(definition: TaskDefinition): void
    }
}

// step 2 — decorate at runtime
export const MongoPlugin = plugin((app) => {
    const _models: ModelDefinition[] = []

    app.decorate('model', (def: ModelDefinition) => {
        _models.push(def)
    })

    app.hook({
        on: 'Ready',
        run: async () => {
            const { uri, dbName } = app.config('db') // reads from global config
            const db = await createConnection(uri, dbName)
            for (const model of _models) {
                model.bindDb(db)
            }
        },
    })
})

// feature plugin — uses extended methods
export const userPlugin = plugin((app) => {
    app.model(UserModel) // from MongoPlugin
    app.job(SendEmailJob) // from QueuePlugin
    app.program(userProgram) // core
    app.hook({ on: 'Request', run: authHook }) // core
    app.service(MailService) // core
})

// plugin composing other plugins
export const adminPlugin = plugin((app) => {
    app.use(userPlugin) // sub-plugin
    app.use(orderPlugin) // sub-plugin
    app.program(adminProgram)
    app.hook({ on: 'Request', run: adminAuthHook })
})

// app.decorate — attach anything to app instance
app.decorate('db', dbInstance) // throws if key already exists
app.decorate('cache', cacheInstance)

// app.config — typed access to global config inside plugins
app.config('db.uri')
app.config('queue')

// ============================================================
// WIRING
// ============================================================

// make() — core app, unchanged
const app = make({ programs: [], services: [], hooks: [] })

// app.use — register a plugin
app.use(ValidateEnv, schema) // with options
app.use(MongoPlugin) // no options — reads from config internally
app.use(QueuePlugin)
app.use(userPlugin)
app.use(orderPlugin)

// serve — entry point, receives app + config
serve(app, config)

// order rules:
// 1. infrastructure plugins first  — they extend app with .model() .job() etc
// 2. feature plugins after         — they call those extended methods
// 3. app.use(ValidateEnv) first of all — validates env before anything connects
```
