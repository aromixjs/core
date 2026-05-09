/**
 * @param {{ typescript: import('typescript/lib/tsserverlibrary') }} modules
 * @returns {import('typescript/lib/tsserverlibrary').server.PluginModule}
 */
function init(modules) {
  const ts = modules.typescript

  return {
    create(info) {
      info.project.projectService.logger.info('[Aromix] ts-plugin loaded')

      const raw = info.languageService
      const proxy = Object.create(null)

      for (const k of Object.keys(raw)) {
        proxy[k] = (...args) => raw[k](...args)
      }

      return proxy
    },

    onConfigurationChanged(config) {}
  }
}

module.exports = init