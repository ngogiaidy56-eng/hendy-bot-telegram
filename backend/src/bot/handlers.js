import { getUser, updateLinkedAccounts } from '../db/userModel.js';

export function setupBotHandlers(bot) {
  bot.on('web_app_data', async (ctx) => {
    try {
      const chatId = ctx.chat.id.toString();
      const u = await getUser(ctx.env, chatId);
      const data = JSON.parse(ctx.message.web_app_data.data);

      if (data.action === 'link_account') {
        const { brand, tk, mk } = data;
        if (!u.linked_accounts[brand]) u.linked_accounts[brand] = [];
        
        if (u.linked_accounts[brand].some(a => a.tk.toLowerCase() === tk.toLowerCase())) {
          return ctx.reply(`😅 Tài khoản \`${tk}\` đã có sẵn tại sảnh ${brand}.`, { parse_mode: 'Markdown' });
        }

        u.linked_accounts[brand].push({ tk, mk, miniCode: tk });
        await updateLinkedAccounts(ctx.env, chatId, u.linked_accounts);

        ctx.reply(`🥰 Đã liên kết \`${tk}\` tại sảnh \`${brand}\`.`, { 
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: [[{ text: "📜 Quản lý tài khoản", callback_data: "v2_links" }]] }
        });
      }
    } catch (error) {
      console.error("Lỗi Web App Data:", error);
    }
  });
}
