const { botToken, botName, chat_file, channel_id, admin_id, admins, moderators } = require('./config.json');

module.exports.isAdmin = function(ctx) {
  return admins.includes(ctx.update.message.from.username);
}

module.exports.isPrivateMessage = function(ctx) {
  return ctx.update.message.chat.type === 'private';
}

module.exports.isGroupChat = function(ctx) {
  return ctx.update.message.chat.type === 'group' || ctx.update.message.chat.type === 'supergroup';
}

module.exports.logToAdmin = function(bot) {
  return err => bot.telegram.sendMessage(admin_id, err);
}

module.exports.hasSpamButton = function(ctx) {
  return ctx.update.callback_query.message.reply_markup.inline_keyboard[0][0].text.startsWith('❌');
}

module.exports.getSpamButton = function(ctx) {
  return module.exports.hasSpamButton(ctx)
    ? getButtonOnPosition(ctx, 0)
    : null;
}

module.exports.getLikeButton = function(ctx) {
  return module.exports.hasSpamButton(ctx)
    ? getButtonOnPosition(ctx, 1)
    : getButtonOnPosition(ctx, 0);
}

module.exports.getJoinButton = function(ctx) {
  return module.exports.hasSpamButton(ctx)
    ? getButtonOnPosition(ctx, 2)
    : getButtonOnPosition(ctx, 1);
}

function getButtonOnPosition(ctx, position) {
  return ctx.update.callback_query.message.reply_markup.inline_keyboard[0][position];
}