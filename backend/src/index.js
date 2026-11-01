import { Telegraf } from 'telegraf';
import { setupBotCommands } from './bot/commands.js';
import { setupBotActions } from './bot/actions.js';
import { setupBotHandlers } from './bot/handlers.js';
import { rateLimitMiddleware } from './middlewares/rateLimiter.js';
import { envValidator } from './config/env.js';

export default {
  async fetch(request, env, ctx) {
    try {
      envValidator(env);
      const url = new URL(request.url);

      const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      };
      if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

      const bot = new Telegraf(env.BOT_TOKEN, { telegram: { webhookReply: true } });
      bot.context.env = env;
      
      setupBotCommands(bot);
      setupBotActions(bot);
      setupBotHandlers(bot);

      // Webhook Telegram
      if (request.method === 'POST' && url.pathname === `/webhook/${env.WEBHOOK_SECRET}`) {
        const update = await request.json();
        await bot.handleUpdate(update);
        return new Response('OK');
      }

      // API Backend
      if (url.pathname.startsWith('/api/')) {
        const ip = request.headers.get('cf-connecting-ip') || 'unknown';
        if (!(await rateLimitMiddleware(env.RATE_LIMITER, ip))) {
          return new Response('Too Many Requests', { status: 429, headers: corsHeaders });
        }
        
        // Ví dụ Endpoint Upload lên R2
        if (request.method === 'POST' && url.pathname === '/api/upload-app') {
            const formData = await request.formData();
            const file = formData.get('file');
            if (file) {
                await env.STORAGE.put(`releases/${file.name}`, file.stream());
                return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
            }
        }
      }

      return new Response('Hendy Bot Backend Active!', { status: 200, headers: corsHeaders });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
  }
};
