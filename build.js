const esbuild = require('esbuild');
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

const distDir = "dist";
// Decide which environment was passed in, e.g. `node build.js dev` => "dev"
// If nothing passed, we default to "dev"
const envArg = process.argv[2] || "dev";

// Load the default env first (lowest priority).
const defaultEnvFile = path.resolve(__dirname, ".env.default");
const defaultEnv = loadEnvFile(defaultEnvFile);
// Attempt to load an override env (e.g. `.dev.env`, `.staging.env`, or `.prod.env`)
const overrideEnvFile = path.resolve(__dirname, `.env.${envArg}`);
const overrideEnv = loadEnvFile(overrideEnvFile);
// Merge them. Values in overrideEnv will replace the ones in defaultEnv.
const finalEnv = { ...defaultEnv, ...overrideEnv };

// For ESBuild, we want to define these constants so references to e.g. 
// DATA_COLLECTION_API_BASE_URL become a literal string in the output.
const defineReplacements = {
    "DATA_COLLECTION_API_BASE_URL": JSON.stringify(finalEnv.DATA_COLLECTION_API_BASE_URL || ""),
    "FOG_HOH_API_BASE_URL": JSON.stringify(finalEnv.FOG_HOH_API_BASE_URL || ""),
    "EXTENSION_HELP_PAGE": JSON.stringify(finalEnv.EXTENSION_HELP_PAGE || ""),
};

const isProd = envArg === "prod";

const files = ['injected/main.ts', 'content.ts', 'popup.ts'];

function loadEnvFile(filePath) {
    if (!fs.existsSync(filePath)) {
        console.warn(`File not found: ${filePath}`);
        return {};
    }

    const content = fs.readFileSync(filePath, "utf-8");
    return dotenv.parse(content);
}

function buildManifest() {
    const manifestPath = path.resolve(__dirname, "config/manifest.template.json");
    const manifestData = fs.readFileSync(manifestPath, "utf-8");
    let manifest = JSON.parse(manifestData);

    manifest.name = finalEnv.EXTENSION_NAME;

    const outPath = path.resolve(__dirname, `${distDir}/manifest.json`);
    fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2), "utf-8");
    console.log("Manifest built!");
}

function buildAll() {
    files.forEach(file => {
        esbuild.buildSync({
            entryPoints: [`src/${file}`],
            bundle: true,
            outfile: `${distDir}/${file.replace('.ts', '.js')}`,
            format: 'iife', // Ensures no import/export issues
            platform: 'browser',
            define: defineReplacements,
            minify: isProd,
        });
    });

    buildManifest();
}

buildAll();

console.log('Build complete!');
