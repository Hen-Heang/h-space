// Ambient declarations for side effect stylesheet imports (e.g. `import "./globals.css"`).
// Next.js ships types for CSS *modules* but not plain side effect .css imports,
// which makes the TS server flag them. This silences that without affecting bundling.

declare module "*.css"