const { botToken, botName, chat_file, channel_id, admin_id, admins, moderators, db_name } = require('./config.json');
const {Database} = require('sqlite3')

const SQLcreate = `CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY,
  message_id INTEGER NOT NULL,
	reporter TEXT NOT NULL,
	timestamp INTEGER NOT NULL,
);`;

function 

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

module.exports.getButtonOnPosition = function(ctx, position) {
  return ctx.update.callback_query.message.reply_markup.inline_keyboard[0][position];
}
module.exports.setSpamReporter = function(message_id, username) {
  let db = new Database(db_name, (err) =>{
    if (err) {
      return bot.telegram.sendMessage(admin_id, err);
    }
  });
  //вставить имя, если его нет в базе
  db.run(`INSERT INTO reports(message_id, reporter, timestamp) 
  SELECT ${message_id}, '${username}', ${Date.now() / 1000} 
  WHERE NOT EXISTS(SELECT 1 FROM reports WHERE message_id = ${message_id} AND reporter = '${reporter}');`,(err) =>{
    if (err) {
      return bot.telegram.sendMessage(admin_id, err);
    }
  })

  db.close((err) =>{
    if (err) {
      return bot.telegram.sendMessage(admin_id, err);
    }
  });

  return
}

module.exports.getSpamReporters = function(message_id){
  let db = new Database(db_name, (err) =>{
    if (err) {
      return bot.telegram.sendMessage(admin_id, err);
    }
  });
  db.run(SQLcreate,(err) =>{
    if (err) {
      return bot.telegram.sendMessage(admin_id, err);
    }
  })

  let reporters = []
  db.serialize(() => {
    db.each(`SELECT reporter as reporter FROM reports WHERE message_id = '${message_id}'`, (err, row) => {
      if (err) {
        bot.telegram.sendMessage(admin_id, err);
      }
      reporters.push(row.reporter)
    });
  });

  db.close((err) =>{
    if (err) {
      return bot.telegram.sendMessage(admin_id, err);
    }
  });

  return reporters;
}