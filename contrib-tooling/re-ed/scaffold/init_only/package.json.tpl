{
  "name": "@entur/{{PKG_NAME}}",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/{{PKG_NAME}}.js",
  "exports": {
    ".": "./dist/{{PKG_NAME}}.js"
  },
  "scripts": {
    "build": "vite build",
    "test": "vitest run"
  },
  "peerDependencies": {
    "react": "^18.0.0 || ^19.0.0",
    "react-dom": "^18.0.0 || ^19.0.0"
  },
  "dependencies": {
    "fast-xml-parser": "^5.3.0"
  }
}
