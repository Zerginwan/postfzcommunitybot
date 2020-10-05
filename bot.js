'use strict';
const { existsSync, closeSync, openSync, writeFileSync, readFileSync, readFile, writeFile } = require('fs');
const { Telegraf } = require('telegraf');
const { markdown } = require('telegraf/extra');
const { callbackButton } = require('telegraf/markup');
const { botToken, botName, chat_file, channel_id, admin_id, admins, moderators } = require('./config.json');
const { isAdmin, isPrivateMessage, isGroupChat, logToAdmin, getLikeButton, getJoinButton, hasSpamButton, getSpamReporters, setSpamReporter } = require('./helpers');
const bot = new Telegraf(botToken, {username: botName}); 

const helpMessage = 'Добавь меня в свою группу, чтобы пользователи могли упоминать меня.\nЕсли упомянуть меня в начале или конце сообщения, я отправлю пост в "Секретные Движухи". \nТак же можно уопмянуть меня в ответе на сообщение. Тогда я обработаю сообщение.\nОтправь /event *Описание события*, чтобы запостить что-то сразу в канал.\nДобавить ссылку на чат: /add_chat\n';
const helpMessageForAdmins = 'Управление через JSON: /get_chats /set_chats\n/show_my_id';
const startMessage = 'Добро пожаловать, Друже!\n'+helpMessage;
const eventMessage = 'Пример использования:\n/event Всем привет. Завтра тестовое событие в 13-00';
const eventMessage2 = 'Ваше событие отправлено в канал';
const add_chatMessage = 'Отправьте /add_chat\nНазвание чата\nСсылка';
const set_chatsMessage = 'Отправьте /set_chats {"Название чата1":"ссылка на чат1","Название чата2":"Ссылка на чат 2"}';

function tryFile() {
    if (existsSync(chat_file)) {
        return
    }

    closeSync(openSync(chat_file, 'w'));
    writeFileSync(chat_file,'{}');
}

function GetChatURL(title){
    //Взять ссылку из конфига.
    let link = ""
    tryFile()
    let data = readFileSync(chat_file)
    let chats = JSON.parse(data);
    
    if(Object.keys(chats).includes(title)) {
        link = chats[title];
    }
        
    return link
}

// Взять сообщение, выжать из него все соки, переформатировать, отправить в канал
async function SendEventMessage(message){
    if (message.text === '') {
        return;
    }

    let newMessage = message.text.split('_').join('\\_') +'\n\n — ';
    let username = message.from.username ? '@'+message.from.username.split('_').join('\\_') : message.from.first_name.split('_').join('\\_')
    newMessage += username;
    if(message.chat.type != 'private') {
        let link = GetChatURL(message.chat.title);
        if(link) {
            newMessage += ` из [${message.chat.title.split('_').join('\\_')}](${link})\n`;
        } else {
            newMessage += ` из «${message.chat.title.split('_').join('\\_')}»\n`;
        }
        newMessage += ` — [Источник](https://t.me/c/${message.chat.id.toString().slice(4)}/${message.message_id})`;
    }
    
    bot.telegram.sendMessage(
        channel_id, 
        newMessage, 
        markdown().webPreview(false).markup(m =>
            m.inlineKeyboard([
                m.callbackButton('❌ Спам!', 'report'),
                m.callbackButton('🧡', 'like'),
                // m.callbackButton('🏃', 'join'),
            ])
        ))
        .catch(logToAdmin(bot));
}

bot.start((ctx) => {
    if(isPrivateMessage(ctx)) {
        ctx.reply(startMessage)
            .catch(logToAdmin(bot));
    }})
    .catch(logToAdmin(bot));; //ответ бота на команду /start

bot.help((ctx) => {
    if(isPrivateMessage(ctx)) {
        ctx.reply(helpMessage)
            .catch(logToAdmin(bot));
    if(admins.includes(ctx.update.message.from.username)){
        ctx.reply(helpMessageForAdmins)
            .catch(logToAdmin(bot))
    }
}})
.catch(logToAdmin(bot));; //ответ бота на команду /help

bot.command('event', (ctx) => {
    if(isPrivateMessage(ctx) && !ctx.update.message.from.is_bot) {
        if(ctx.update.message.text.trim() == '/event') {
            ctx.reply(eventMessage)
                .catch(logToAdmin(bot))
        } else {
            ctx.update.message.text = ctx.update.message.text.replace('/event ', '').trim()
            SendEventMessage(ctx.update.message);
            ctx.reply(eventMessage2)
                .catch(logToAdmin(bot))
        }
    }
})
.catch(logToAdmin(bot));; // //ответ бота на команду /event

bot.command('get_chats', (ctx) => {
    if(isAdmin(ctx)) {
        tryFile();
        readFile(chat_file, (err, data) => {
            if (err) throw err;
            ctx.reply('Текущий JSON: \n' + data)
                .catch(logToAdmin(bot));
        });
    }
})
.catch(logToAdmin(bot));; // //ответ бота на команду /get_chats

bot.command('set_chats', async function(ctx) {
    if(isPrivateMessage(ctx) && isAdmin(ctx)) {
        if(ctx.update.message.text.trim() == '/set_chats') {
            ctx.telegram.sendMessage(ctx.from.id, set_chatsMessage)
        } else {
            tryFile()
            readFile(chat_file, (err, data) => {
                if (err) throw err;

                ctx.reply('Старый JSON: \n' + data)
                    .catch(logToAdmin(bot));

                writeFile(
                    chat_file, 
                    ctx.update.message.text.replace('/set_chats','').trim(), 
                    err => bot.telegram.sendMessage(admin_id, err));

                readFile(chat_file, (err, data) => {
                    if (err) throw err;

                    ctx.reply('Новый JSON: \n' + data)
                        .catch(logToAdmin(bot));
                });
            });
        }
    }
})
.catch(logToAdmin(bot));; // //ответ бота на команду /set_chats

bot.command('add_chat', (ctx) => {
    // if(isAdmin(ctx)){
        if(ctx.update.message.text.trim() == '/add_chat'){
            ctx.telegram.sendMessage(ctx.from.id, add_chatMessage)
        } else {
            tryFile();
            readFile(chat_file, (err, data) =>{
                if (err) throw err;
                let json = JSON.parse(data);
                let chat = ctx.update.message.text.split('\n')[1].trim();
                let link = ctx.update.message.text.split('\n')[2].trim();
                if(chat){
                    json[chat] = link;
                    writeFile(chat_file, JSON.stringify(json),(err) => {
                        bot.telegram.sendMessage(admin_id, err);
                      });
                    ctx.telegram
                        .sendMessage(ctx.from.id, `Добавлена ссылка на чат ${chat}:
                    ${link}`)
                        .catch(logToAdmin(bot));
                }else{
                    ctx.reply('Неверный формат.\n' + add_chatMessage)
                        .catch(logToAdmin(bot));
                }
            });
        }
    // }
})
.catch(logToAdmin(bot));; // //ответ бота на команду /add_chat

bot.mention(botName, (ctx) => {
    //Обрабатываем упоминания бота только от людей в групповых чатах
    if(isGroupChat(ctx) && !ctx.update.message.from.is_bot) {
        //если это реплай на сообщение - ищем сообщение
        if(ctx.update.message.reply_to_message) {
            //в сообщении только упоминание.
            if(ctx.update.message.text.trim().toLowerCase() == '@'+botName.toLowerCase()) {
                SendEventMessage(ctx.update.message.reply_to_message);
            }
        } else {
        //Если это сообщение самостоятельно - обрабатываем его, 
        // если текст начинает или заканчивается упоминанием.
            if(ctx.update.message.text.trim().split()[0].toLowerCase() === ('@'+botName).toLowerCase() || ctx.update.message.text.trim().split()[-1].toLowerCase() === ('@'+botName).toLowerCase()) {
                ctx.update.message.text = ctx.update.message.text.replace('@'+botName, '').trim()
                SendEventMessage(ctx.update.message);
            }
        }
    }
})
.catch(logToAdmin(bot));;

bot.command('show_my_id',ctx => { 
    ctx.reply(ctx.update.message.chat.id)
        .catch(logToAdmin(bot));
})
.catch(logToAdmin(bot));;

bot.action('report', ctx => {
    let message_id = ctx.update.callback_query.message.message_id
    let username = ctx.update.callback_query.from.username ? ctx.update.callback_query.from.username : ctx.update.callback_query.from.first_name
    let spamReporters = getSpamReporters(message_id, bot)
    let oldReportersCount = spamReporters.length
    spamReporters.push(username)
    //берем только уникальные значения
    let uniqueReporters = [...new Set(spamReporters)]
    if(oldReportersCount < uniqueReporters.length){
        setSpamReporter(message_id, username, bot)
    }
    if(uniqueReporters.length > 9){

        moderators.forEach(moderator_id => {
            bot.telegram
                .sendMessage(moderator_id, `Пользователь @${username.split('_').join('\\_')} посчитал [это сообщение](https://t.me/c/${channel_id.toString().slice(4)}/${ctx.update.callback_query.message.message_id}) спамом наряду с другими 9 пользователями`, markdown())
                .catch(logToAdmin(bot));
        });
        let likes = getLikeButton(ctx).text.slice(2);
        // let joins = getJoinButton(ctx).text.slice(2);
	    if(!likes) likes = "";
	    // if(!joins) joins = "";
        ctx.editMessageReplyMarkup({
            inline_keyboard: [
                [
                    callbackButton(`❤️${likes}`, 'like'),
                    // callbackButton(`🏃${joins}`, 'join'),
                ]
            ]
        });
    }
});

bot.action('like', async ctx => {
    let likes = getLikeButton(ctx).text.slice(2) || 0;
    // let joins = getJoinButton(ctx).text.slice(2);

    let callbackButtons = [
        callbackButton(`❤️${parseInt(likes) + 1}`, 'like'),
        // callbackButton(`🏃${joins}`, 'join'),
    ];

    if (hasSpamButton(ctx)) {
        callbackButtons.unshift(
            callbackButton('❌ Спам!', 'report')
        )
    }

    ctx.editMessageReplyMarkup({
        inline_keyboard: [ [ ...callbackButtons ] ]
    });
})
.catch(logToAdmin(bot));;

bot.action('join', async ctx => {
    let likes = getLikeButton(ctx).text.slice(2);
    let joins = getJoinButton(ctx).text.slice(2) || 0;

    let callbackButtons = [
        callbackButton(`❤️${likes}`, 'like'),
        callbackButton(`🏃${parseInt(joins) + 1}`, 'join'),
    ];

    if (hasSpamButton(ctx)) {
        callbackButtons.unshift(
            callbackButton('❌ Спам!', 'report')
        )
    }

    ctx.editMessageReplyMarkup({
        inline_keyboard: [ [ ...callbackButtons ] ]
    });
})
.catch(logToAdmin(bot));;

bot.command('test', (ctx) => {
    let reporters = getSpamReporters(ctx.update.message.message_id, bot);
    setSpamReporter(ctx.update.message.message_id, ctx.update.message.from.username, bot);
    ctx.reply(reporters)
})
.catch(logToAdmin(bot));;

bot.launch();
