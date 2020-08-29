'use strict';
const { existsSync, closeSync, openSync, writeFileSync, readFileSync, readFile, writeFile } = require('fs');
const { Telegraf } = require('telegraf');
const { markdown } = require('telegraf/extra');
const { callbackButton } = require('telegraf/markup');
const { botToken, botName, chat_file, channel_id, admin_id, admins, moderators } = require('./config.json');
const { isAdmin, isPrivateMessage, logToAdmin, getLikeButton, getJoinButton, hasSpamButton } = require('./helpers');
const bot = new Telegraf(botToken, {username: botName}); 

const helpMessage = 'Добавь меня в свою группу, чтобы пользователи могли упоминать меня.\nЕсли упомянуть меня в начале или конце сообщения, я отправлю пост в "Секретные Движухи". \nТак же можно уопмянуть меня в ответе на сообщение. Тогда я обработаю сообщение.\nОтправь /event *Описание события*, чтобы запостить что-то сразу в канал.';
const helpMessageForAdmins = 'Добавить чат: /add_chat \n Управление через JSON: /get_chats /set_chats\n/show_my_id';
const startMessage = 'Добро пожаловать, Друже!\n'+helpMessage;
const eventMessage = 'Пример использования:\n/event Всем привет. Завтра тестовое событие в 13-00';
const eventMessage2 = 'Ваше событие отправлено в канал';
const add_chatMessage = 'Отправьте /add_chat ***Название чата*$*Ссылка';
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

    let newMessage = message.text.replace('_','\\_') +'\n\n - @';
    newMessage += message.from.username.replace('_','\\_');
    if(message.chat.type != 'private') {
        let link = GetChatURL(message.chat.title);
        if(link) {
            newMessage += ` из [${message.chat.title.replace('_','\\_')}](${link})\n`;
        } else {
            newMessage += ` из «${message.chat.title.replace('_','\\_')}»\n`;
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
                m.callbackButton('🏃', 'join'),
            ])
        ))
        .catch(err => 
            bot.telegram.sendMessage(admin_id, err));
}

bot.start((ctx) => {
    if(isPrivateMessage(ctx)) {
        ctx.reply(startMessage)
    }}); //ответ бота на команду /start

bot.help((ctx) => {
    if(isPrivateMessage(ctx)) {
        ctx.reply(helpMessage);
    if(admins.includes(ctx.update.message.from.username)){
        ctx.reply(helpMessageForAdmins)
    }
}}); //ответ бота на команду /help

bot.command('event', (ctx) => {
    if(isPrivateMessage(ctx) && !ctx.update.message.from.is_bot) {
        if(ctx.update.message.text.trim() == '/event') {
            ctx.reply(eventMessage)
        } else {
            ctx.update.message.text = ctx.update.message.text.replace('/event ', '').trim()
            SendEventMessage(ctx.update.message);
            ctx.reply(eventMessage2)
        }
    }
}); // //ответ бота на команду /event

bot.command('get_chats', (ctx) => {
    if(isAdmin(ctx)) {
        tryFile();
        readFile(chat_file, (err, data) => {
            if (err) throw err;
            ctx.reply('Текущий JSON: \n' + data);
        });
    }
}); // //ответ бота на команду /get_chats

bot.command('set_chats', async function(ctx) {
    if(isPrivateMessage(ctx) && isAdmin(ctx)) {
        if(ctx.update.message.text.trim() == '/set_chats') {
            ctx.telegram.sendMessage(ctx.from.id, set_chatsMessage)
        } else {
            tryFile()
            readFile(chat_file, (err, data) => {
                if (err) throw err;

                ctx.reply('Старый JSON: \n' + data);

                writeFile(
                    chat_file, 
                    ctx.update.message.text.replace('/set_chats','').trim(), 
                    err => bot.telegram.sendMessage(admin_id, err));

                readFile(chat_file, (err, data) => {
                    if (err) throw err;

                    ctx.reply('Новый JSON: \n' + data);
                });
            });
        }
    }
}); // //ответ бота на команду /set_chats

bot.command('add_chat', (ctx) => {
    if(admins.includes(ctx.update.message.from.username)){
        if(ctx.update.message.text == '/add_chat'){
            ctx.telegram.sendMessage(ctx.from.id, add_chatMessage)
        } else {
            tryFile();
            readFile(chat_file, (err, data) =>{
                if (err) throw err;
                let json = JSON.parse(data);
                let chat = ctx.update.message.text.replace('/add_chat ***','');
                if(chat.includes('*$*') && !chat.startsWith(' ')){
                    json[chat.split('*$*')[0]] = chat.split('*$*')[1];
                    writeFile(chat_file, JSON.stringify(json),(err) => {
                        bot.telegram.sendMessage(admin_id, err);
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

bot.mention(botName, (ctx) => {
    //Обрабатываем упоминания бота только от людей в групповых чатах
    if(isGroupChat(ctx) && !ctx.update.message.from.is_bot) {
        //если это реплай на сообщение - ищем сообщение
        if(ctx.update.message.reply_to_message) {
            //в сообщении только упоминание.
            if(ctx.update.message.text == '@'+botName) {
                SendEventMessage(ctx.update.message.reply_to_message);
            }
        } else {
        //Если это сообщение самостоятельно - обрабатываем его, 
        // если текст начинает или заканчивается упоминанием.
            if(ctx.update.message.text.endsWith('@'+botName) || ctx.update.message.text.startsWith('@'+botName)) {
                ctx.update.message.text = ctx.update.message.text.replace('@'+botName, '').trim()
                SendEventMessage(ctx.update.message);
            }
        }
    }
});

bot.command('show_my_id',ctx => { 
    ctx.reply(ctx.update.message.chat.id);
});

bot.action('report', ctx => {
    moderators.forEach(moderator_id => {
        bot.telegram
            .sendMessage(moderator_id, `Пользователь @${ctx.update.callback_query.from.username.replace('_','\\_')} посчитал [это сообщение](https://t.me/c/${channel_id.toString().slice(4)}/${ctx.update.callback_query.message.message_id}) спамом`, markdown())
            .catch(logToAdmin(bot));
    });
    let likes = getLikeButton(ctx).text.slice(2);
    let joins = getJoinButton(ctx).text.slice(2);
	if(!likes) likes = "";
	if(!joins) joins = "";
    ctx.editMessageReplyMarkup({
        inline_keyboard: [
            [
                callbackButton(`❤️${likes}`, 'like'),
                callbackButton(`🏃${joins}`, 'join'),
            ]
        ]
    });
});

bot.action('like', async ctx => {
    let likes = getLikeButton(ctx).text.slice(2) || 0;
    let joins = getJoinButton(ctx).text.slice(2);

    let callbackButtons = [
        callbackButton(`❤️${parseInt(likes) + 1}`, 'like'),
        callbackButton(`🏃${joins}`, 'join'),
    ];

    if (hasSpamButton(ctx)) {
        callbackButtons.unshift(
            callbackButton('❌ Спам!', 'report')
        )
    }

    ctx.editMessageReplyMarkup({
        inline_keyboard: [ [ ...callbackButtons ] ]
    });
});

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
});

bot.command('test', ctx => {
    moderators.forEach(moderator_id => {
        bot.telegram.sendMessage(moderator_id, 'Тест на спам')
    });
});

bot.launch();
