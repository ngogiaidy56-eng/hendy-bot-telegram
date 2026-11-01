import { upsertUser } from '../db/userModel.js';
import { getMainMenu } from './keyboards.js';

export function setupBotCommands(bot) {
  bot.start(async (ctx) => {
    const chatId = ctx.chat.id.toString();
    const name = ctx.from?.first_name || 'Khách';
    const user = await upsertUser(ctx.env, chatId, name);
    
    const text = `🤖 *HENDY CYBERTECH PRO v2026* [BOT CHÍNH] 🚀\n` +
                 `Buổi tối vui vẻ, *${user.name}*\nID: \`${chatId}\`\n` +
                 `💰 **Ví:** \`${(user.balance || 0).toLocaleString('vi-VN')} VNĐ\`\n` +
                 `🌐 Web: https://hendy-web-user.pages.dev`;

    await ctx.reply(text, { parse_mode: 'Markdown', ...getMainMenu(ctx.env) });
  });
}
