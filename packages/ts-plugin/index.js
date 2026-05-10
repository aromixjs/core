/**
 * @param {{ typescript: import('typescript/lib/tsserverlibrary') }} modules
 * @returns {import('typescript/lib/tsserverlibrary').server.PluginModule}
 */
function init(modules) {
  const ts = modules.typescript;

  return {
    create(info) {
      info.project.projectService.logger.info("[Aromix] ts-plugin loaded");
      const raw = info.languageService;


      return raw;
    },

    onConfigurationChanged(config) {},
  };
}

module.exports = init;
