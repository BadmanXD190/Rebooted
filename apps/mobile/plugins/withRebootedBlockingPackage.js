const { withMainApplication } = require('@expo/config-plugins');

module.exports = function withRebootedBlockingPackage(config) {
  return withMainApplication(config, (config) => {
    const mainApplication = config.modResults.contents;
    
    // Check if RebootedBlockingPackage is already imported
    if (!mainApplication.includes('RebootedBlockingPackage')) {
      // Add import
      const importStatement = 'import com.rebooted.app.RebootedBlockingPackage;';
      const packageImportIndex = mainApplication.indexOf('import com.facebook.react.ReactPackage;');
      
      if (packageImportIndex !== -1) {
        const insertIndex = mainApplication.indexOf('\n', packageImportIndex) + 1;
        config.modResults.contents = 
          mainApplication.slice(0, insertIndex) +
          importStatement + '\n' +
          mainApplication.slice(insertIndex);
      }
      
      // Add to packages list
      const packagesListMatch = mainApplication.match(/override fun getPackages\(\): List<ReactPackage> \{[\s\S]*?return listOf\(([\s\S]*?)\)/);
      if (packagesListMatch) {
        const packagesList = packagesListMatch[1];
        if (!packagesList.includes('RebootedBlockingPackage()')) {
          config.modResults.contents = config.modResults.contents.replace(
            /(return listOf\([\s\S]*?)(\))/,
            `$1RebootedBlockingPackage(),\n$2`
          );
        }
      }
    }
    
    return config;
  });
};

