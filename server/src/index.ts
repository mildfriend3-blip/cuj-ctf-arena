import { app } from './app.js';
import { PORT } from './config.js';
import { ensureSeeded } from './seed.js';

ensureSeeded()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`[CUJ CyberOps CTF] Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('[CUJ CyberOps CTF] Startup failure:', err);
    process.exit(1);
  });
