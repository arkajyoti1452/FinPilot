import { app } from './app.js';
import { config } from './config.js';

app.listen(config.PORT, () => {
  console.log(`FinPilot API listening on http://localhost:${config.PORT}`);
  console.log(`Gemini API key configured: ${Boolean(config.GEMINI_API_KEY)}`);
});
