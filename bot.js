'use strict';
const fs = require('fs');
const { Telegraf } = require('telegraf');
const Extra = require('telegraf/extra')
const Markup = require('telegraf/markup')
const config = require('./config.json')
const bot = new Telegraf(config.botToken, {username: config.botName}); 

const helpMessage = 'Добавь меня в свою группу, чтобы пользователи могли упоминать меня.\nЕсли упомянуть меня в начале или конце сообщения, я отправлю пост в "Секретные Движухи". \nТак же можно уопмянуть меня в ответе на сообщение. Тогда я обработаю сообщение.\nОтправь /event *Описание события*, чтобы запостить что-то сразу в канал.';
const helpMessageForAdmins = 'Добавить чат: /add_chat \n Управление через JSON: /get_chats /set_chats\n/show_my_id';
const startMessage = 'Добро пожаловать, Друже!\n'+helpMessage;
const eventMessage = 'Пример использования:\n/event Всем привет. Завтра тестовое событие в 13-00';
const eventMessage2 = 'Ваше событие отправлено в канал';
const add_chatMessage = 'Отправьте /add_chat ***Название чата*$*Ссылка';
const set_chatsMessage = 'Отправьте /set_chats {"Название чата1":"ссылка на чат1","Название чата2":"Ссылка на чат 2"}';

function tryFile() {
        if (fs.existsSync(config.chat_file)) {
          return
        }else{
            fs.closeSync(fs.openSync(config.chat_file, 'w'));
            fs.writeFileSync(config.chat_file,'{}');
        }
}

function GetChatURL(title){
    //Взять ссылку из конфига.
    tryFile()
    fs.readFile(config.chat_file, (err, data) =>{
        if (err) throw err;
        let chats = JSON.parse(data);
        if(chats[title]){
            return chats[title];
        }else{
            return;
        }
    });
   
}

// Взять сообщение, выжать из него все соки, переформатировать, отправить в канал
async function SendEventMessage(message){
    if(message.text != ''){
    let newMessage = message.text.replace('_','\\_') +'\n\n- @';
    newMessage += message.from.username.replace('_','\\_');
    if(message.chat.type != 'private'){
        let link = GetChatURL(message.chat.title);
        if(link){
            newMessage += ' из [' + message.chat.title.replace('_','\\_') +']('+link+')\n';
        }else{
            newMessage += ' из "' + message.chat.title.replace('_','\\_') +'"\n';
        }
        newMessage += '- [Источник](https://t.me/c/' + message.chat.id.toString().slice(4) +'/'+message.message_id+')';

    }
    
    bot.telegram
        .sendMessage(config.channel_id, newMessage, Extra.markdown().markup((m) =>
        m.inlineKeyboard([
          m.callbackButton('❌ Спам!', 'report'),
          m.callbackButton('🧡', 'like'),
          m.callbackButton('🏃', 'join'),
        ])))
        .catch((err)=>{
            bot.telegram.sendMessage(config.admin_id, err);
        });
}

}

bot.start((ctx) => {
    if(ctx.update.message.chat.type == 'private'){
        ctx.reply(startMessage)
    }}); //ответ бота на команду /start
bot.help((ctx) => {
    if(ctx.update.message.chat.type == 'private'){
    ctx.reply(helpMessage);
    if(config.admins.includes(ctx.update.message.from.username)){
        ctx.reply(helpMessageForAdmins)
    }
}}); //ответ бота на команду /help

bot.command('event', (ctx) => {
    if(ctx.update.message.chat.type == 'private'){
    if(!ctx.update.message.from.is_bot){
        if(ctx.update.message.text.trim() == '/event'){
            ctx.reply(eventMessage)
        }else{
            ctx.update.message.text = ctx.update.message.text.replace('/event ', '').trim()
            SendEventMessage(ctx.update.message);
            ctx.reply(eventMessage2)
        }
    }
}
}); // //ответ бота на команду /event

bot.command('get_chats', (ctx) => {
    if(config.admins.includes(ctx.update.message.from.username)){
        tryFile();
        fs.readFile(config.chat_file, (err, data) =>{
            if (err) throw err;
            ctx.reply('Текущий JSON: \n' + data);
        });
    }
}); // //ответ бота на команду /get_chats
bot.command('set_chats', async function(ctx) {
    if(ctx.update.message.chat.type == 'private'){
    if(config.admins.includes(ctx.update.message.from.username)){
        if(ctx.update.message.text.trim() == '/set_chats'){
            ctx.telegram.sendMessage(ctx.from.id, set_chatsMessage)
        }else{
            tryFile()
            let readPromise = fs.readFile(config.chat_file, (err, data) =>{
                if (err) throw err;
                ctx.reply('Старый JSON: \n' + data);
                fs.writeFile(config.chat_file, ctx.update.message.text.replace('/set_chats','').trim(),(err) => {
                    bot.telegram.sendMessage(config.admin_id, err);
                  });
                fs.readFile(config.chat_file, (err, data) =>{
                    if (err) throw err;
                    ctx.reply('Новый JSON: \n' + data);
                });
            });
            

        }
    }
}}); // //ответ бота на команду /set_chats
bot.command('add_chat', (ctx) => {
    if(config.admins.includes(ctx.update.message.from.username)){
        if(ctx.update.message.text == '/add_chat'){
            ctx.telegram.sendMessage(ctx.from.id, add_chatMessage)
        }else{
            tryFile();
            fs.readFile(config.chat_file, (err, data) =>{
                if (err) throw err;
                let json = JSON.parse(data);
                let chat = ctx.update.message.text.replace('/add_chat ***','');
                if(chat.includes('*$*') && !chat.startsWith(' ')){
                    json[chat.split('*$*')[0]] = chat.split('*$*')[1];
                    fs.writeFile(config.chat_file, JSON.stringify(json),(err) => {
                        bot.telegram.sendMessage(config.admin_id, err);
                      });
                    ctx.telegram.sendMessage(ctx.from.id, `Добавлена ссылка на чат ${chat.split('*$*')[0]}
                    ${chat.split('*$*')[1]}`);
                }else{
                    ctx.reply('Неверный формат.\n' + add_chatMessage);
                }
            });
        }
    }
}); // //ответ бота на команду /add_chat

bot.mention(config.botName, (ctx) => {
    //Обрабатываем упоминания бота только от людей в групповых чатах
    if((ctx.update.message.chat.type == 'group' || ctx.update.message.chat.type == 'supergroup') && !ctx.update.message.from.is_bot){
        //если это реплай на сообщение - ищем сообщение
        if(ctx.update.message.reply_to_message){
            //в сообщении только упоминание.
            if(ctx.update.message.text == '@'+config.botName){
                SendEventMessage(ctx.update.message.reply_to_message);
            }
        }else{
        //Если это сообщение самостоятельно - обрабатываем его, 
        // если текст начинает или заканчивается упоминанием.
            if(ctx.update.message.text.endsWith('@'+config.botName) || ctx.update.message.text.startsWith('@'+config.botName)){
                ctx.update.message.text = ctx.update.message.text.replace('@'+config.botName, '').trim()
                SendEventMessage(ctx.update.message);
            }
        }
    }
});

bot.command('show_my_id',(ctx)=>{
    
      ctx.reply(ctx.update.message.from.id);
})
bot.action('report', (ctx)=>{
    config.moderators.forEach((moderator_id) => {
        bot.telegram.sendMessage(moderator_id, 'Пользователь @'+ctx.update.callback_query.from.username.replace('_','\_')+' посчитал [это сообщение](https://t.me/'+config.channel_id.toString().slice(4) +'/'+ ctx.update.callback_query.message.message_id + ') спамом',Extra.markdown())
    });
    let likes = ctx.update.callback_query.message.reply_markup.inline_keyboard[0][1].text.slice(2);
    let joins = ctx.update.callback_query.message.reply_markup.inline_keyboard[0][2].text.slice(2);
    ctx.editMessageReplyMarkup({
        inline_keyboard: [
            [
                Markup.callbackButton(`❤️${likes}`, 'like'),
                Markup.callbackButton(`🏃${joins}`, 'join'),
            ]
        ]
    });
})
bot.action('like',async (ctx) =>{
    let num = ctx.update.callback_query.message.reply_markup.inline_keyboard[0][1].text.startsWith('❌')?1:0;
    let likes = 0;
    if(ctx.update.callback_query.message.reply_markup.inline_keyboard[0][num].text.slice(2)){
        likes = ctx.update.callback_query.message.reply_markup.inline_keyboard[0][num].text.slice(2);
    }
    let joins = ctx.update.callback_query.message.reply_markup.inline_keyboard[0][parseInt(num) + 1].text.slice(2);
    if(num){
        ctx.editMessageReplyMarkup({
            inline_keyboard: [
                [
                    Markup.callbackButton('❌ Спам!', 'report'),
                    Markup.callbackButton(`❤️${parseInt(likes) + 1}`, 'like'),
                    Markup.callbackButton(`🏃${joins}`, 'join'),
                ]
            ]
        });
    }else{
        ctx.editMessageReplyMarkup({
            inline_keyboard: [
                [
                    Markup.callbackButton(`❤️${parseInt(likes) + 1}`, 'like'),
                    Markup.callbackButton(`🏃${joins}`, 'join'),
                ]
            ]
        });
    }
})
bot.action('join',async (ctx) =>{
    let num = ctx.update.callback_query.message.reply_markup.inline_keyboard[0][1].text.startsWith('❌')?1:0;
    let joins = 0;
    if(ctx.update.callback_query.message.reply_markup.inline_keyboard[0][parseInt(num) + 1].text.slice(2)){
        joins = ctx.update.callback_query.message.reply_markup.inline_keyboard[0][parseInt(num) + 1].text.slice(2);
    }
    let likes = ctx.update.callback_query.message.reply_markup.inline_keyboard[0][num].text.slice(2);
    if(num){
        ctx.editMessageReplyMarkup({
            inline_keyboard: [
                [
                    Markup.callbackButton('❌ Спам!', 'report'),
                    Markup.callbackButton(`❤️${likes}`, 'like'),
                    Markup.callbackButton(`🏃${parseInt(joins) + 1}`, 'join'),
                ]
            ]
        });
    }else{
        ctx.editMessageReplyMarkup({
            inline_keyboard: [
                [
                    Markup.callbackButton(`❤️${likes}`, 'like'),
                    Markup.callbackButton(`🏃${parseInt(joins) + 1}`, 'join'),
                ]
            ]
        });
    }
})

bot.launch();
