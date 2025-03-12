const esbuild = require('esbuild');

const files = ['injected/main.ts', 'content.ts', 'popup.ts'];

files.forEach(file => {
    esbuild.buildSync({
        entryPoints: [`src/${file}`],
        bundle: true,
        outfile: `dist/${file.replace('.ts', '.js')}`,
        format: 'iife', // Ensures no import/export issues
        platform: 'browser'
    });
});

console.log('Build complete!');
