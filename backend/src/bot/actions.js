import { getUser, updateLinkedAccounts } from '../db/userModel.js';
import { getMainMenu, getMinigameMenu, getV2LinksMenu } from './keyboards.js';

export function setupBotActions(bot) {
  bot.action('back_start', async (ctx) => {
    const u = await getUser(ctx.env, ctx.chat.id.toString());
    const text = `🤖 *HENDY CYBERTECH PRO v2026* 🚀\nChào, *${u.name}*\n💰 **Ví:** \`${(u.balance || 0).toLocaleString('vi-VN')} VNĐ\``;
    await ctx.editMessageText(text, { parse_mode: 'Markdown', ...getMainMenu(ctx.env) });
  });

  bot.action('menu_minigame', async (ctx) => {
    await ctx.editMessageText(`LIVESTREAM 🚀\n*PREMIUM* 👑`, { parse_mode: 'Markdown', ...getMinigameMenu() });
  });

  bot.action('v2_links', async (ctx) => {
    const u = await getUser(ctx.env, ctx.chat.id.toString());
    await ctx.editMessageText(`MINI GAME\n📊 *Thống Kê Liên Kết*`, { parse_mode: 'Markdown', ...getV2LinksMenu(u.linked_accounts) });
  });

  bot.action(/^manage_(.+)$/, async (ctx) => {
    const brand = ctx.match[1];
    const u = await getUser(ctx.env, ctx.chat.id.toString());
    const accounts = u.linked_accounts[brand] || [];
    
    let text = `📂 *DANH SÁCH TÀI KHOẢN (${brand})*\n`;
    const buttons = [];
    if (accounts.length === 0) text += "Chưa có tài khoản nào.";
    else {
      accounts.forEach((acc, idx) => {
        text += `${idx + 1}. TK: \`${acc.tk}\` - Code: \`${acc.miniCode}\`\n`;
        buttons.push([{ text: `❌ Xóa ${acc.tk}`, callback_data: `del_${brand}_${idx}` }]);
      });
    }
    buttons.push([{ text: '🔙 Quay lại', callback_data: 'v2_links' }]);
    
    await ctx.editMessageText(text, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: buttons } });
  });

  bot.action(/^del_(.+)_(\d+)$/, async (ctx) => {
    const brand = ctx.match[1];
    const idx = parseInt(ctx.match[2]);
    const u = await getUser(ctx.env, ctx.chat.id.toString());
    
    if (u.linked_accounts[brand] && u.linked_accounts[brand].length > idx) {
      u.linked_accounts[brand].splice(idx, 1);
      await updateLinkedAccounts(ctx.env, ctx.chat.id.toString(), u.linked_accounts);
      await ctx.answerCbQuery('Đã xóa thành công!');
      ctx.match[1] = brand; 
      bot.handleUpdate({ callback_query: { ...ctx.callbackQuery, data: `manage_${brand}` }});
    }
  });

  bot.action('unimplemented', (ctx) => ctx.answerCbQuery('🚀 Tính năng sắp ra mắt!', { show_alert: true }));
}
