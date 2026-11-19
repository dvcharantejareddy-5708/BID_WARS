export default async function handler(req, res) {
  const diagnostics = {
    cwd: process.cwd(),
    nodeVersion: process.version,
    argv: process.argv,
    envKeys: Object.keys(process.env).filter(k => !k.includes('SECRET') && !k.includes('KEY') && !k.includes('TOKEN') && !k.includes('PASSWORD')),
    serverDirExists: false,
    serverIndexExists: false,
    serverImportError: null,
    serverLoaded: null
  };

  try {
    const fs = await import('fs');
    const path = await import('path');
    
    const serverPath = path.join(process.cwd(), 'server', 'index.js');
    diagnostics.serverDirExists = fs.existsSync(path.join(process.cwd(), 'server'));
    diagnostics.serverIndexExists = fs.existsSync(serverPath);

    try {
      const serverModule = await import('../server/index.js');
      diagnostics.serverLoaded = typeof (serverModule.default || serverModule.handler || serverModule);
    } catch (importErr) {
      diagnostics.serverImportError = {
        message: importErr?.message || String(importErr),
        stack: importErr?.stack || null,
        code: importErr?.code || null
      };
    }
  } catch (err) {
    diagnostics.diagError = err?.message || String(err);
  }

  res.setHeader('Content-Type', 'application/json');
  return res.status(200).json(diagnostics);
}
