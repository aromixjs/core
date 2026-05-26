import { ObjectProcessor } from "@aromix/core"

const config = {
      app: {
            name: 'Velvet UI',
            version: '1.4.2',
            env: {
                  mode: 'production',
                  debug: false,
                  region: 'ap-south-1',
            },
      },

      server: {
            host: 'localhost',
            port: 8080,

            ssl: {
                  enabled: true,
                  cert: {
                        path: '/etc/ssl/cert.pem',
                        expires: new Date('2027-01-01'),
                  },
            },
      },

      database: {
            primary: {
                  client: 'postgres',
                  host: 'db.internal',
                  port: 5432,

                  auth: {
                        username: 'admin',
                        password: 'secret',
                  },

                  pool: {
                        min: 2,
                        max: 20,
                  },
            },

            redis: {
                  host: 'redis.internal',
                  port: 6379,
            },
      },

      features: {
            auth: {
                  enabled: true,

                  providers: {
                        github: {
                              clientId: 'gh_xxx',
                              scopes: ['repo', 'user'],
                        },

                        google: {
                              clientId: 'g_xxx',
                        },
                  },
            },

            uploads: {
                  enabled: true,

                  limits: {
                        image: {
                              maxSizeMb: 10,
                              formats: ['png', 'jpg', 'webp'],
                        },

                        video: {
                              maxSizeMb: 500,
                        },
                  },
            },
      },

      analytics: {
            enabled: true,

            providers: {
                  posthog: {
                        apiKey: 'ph_test',
                        endpoint: 'https://analytics.example.com',
                  },
            },
      },
}

const flatten = new ObjectProcessor(config).crushKeys()
