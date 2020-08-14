const fs = require('fs');
const md = require('./md_friendly');

const get_data = () => JSON.parse(fs.readFileSync('data.json', 'utf8'));
// const save_data = data => fs.writeFileSync('data.json', JSON.stringify(data));

const COMMANDS_MESSAGE_TEXT =
    '🛠 *Команды администратора*\n' +
    '\n' +
    '*/start* \\- для вызова главного меню\n' +
    '\n' +
    '*/add\\_webinar* \\- Для создания вебинара\\. Нужно указать *_название_* вебинара, его *_стоимость_* и *_описание_*\\.  Можно также прикрепить *_картинку_*\\.\n' +
    'Например:\n' +
    '\n' +
    '```\n' +
    '/add\\_webinar\n' +
    'Интересный вебинар\n' +
    '999\n' +
    'И каждая следующая строка будет частью описания "интересного вебинара"\\.\n' +
    '```\n' +
    '*/add\\_material* \\- для добавления материала \\(урока\\) в вебинар\\. Нужно указать *_название_* вебинара, в который нужно добавить этот материал, *_название_* самого материла \\(текст на кнопке\\)\\. Можно также дописать *_описание_* для этого материла\\. Обязательно прикрепить *_картинку/документ/видео_*\\.\n' +
    'Например:\n' +
    '\n' +
    '```\n' +
    '/add\\_material\n' +
    'Интересный вебинар\n' +
    'Вступление\n' +
    'Все следующие строки \\- описание этого материала, которое получают пользователи\\.\n' +
    '```\n' +
    '*/remove\\_webinar* \\- для удаления вебинара\\. Нужно указать *_название_* вебинара\n' +
    'Например:\n' +
    '\n' +
    '```\n' +
    '/remove_webinar Интересный вебинар\n' +
    '```\n' +
    '*/remove\\_material* \\- для удаления материала \\(урока\\) из вебинара\\. Нужно указать *_название_* вебинара и *_название_* материала\n' +
    'Например:\n' +
    '\n' +
    '```\n' +
    '/remove_material\n' +
    'Интересный вебинар\n' +
    'Вступление\n' +
    '```\n';


const handle_callback = async ctx => {
    let [command, ...args] = ctx.update.callback_query.data.split(':');
    console.log(command, args);

    let data = get_data();
    if (command == 'private_group') {
        ctx.answerCbQuery('ℹ️ Администратору это меню не требуется');
    } else if (command == 'catalog') {
        let new_text =
            '📂 Каталог';
        let back_button_text;
        if (args[0] == 'back') back_button_text = '👈 Назад';
        else back_button_text = '👈 Меню'
        let keyboard = [];
        for (let webinar of data.webinars) {
            keyboard.push([{
                text: webinar.name + ' (' + webinar.price + 'р.)',
                callback_data: 'webinar:' + webinar.uid
            }]);
        }
        keyboard.push([{
            text: back_button_text,
            callback_data: 'back:main'
        }]);
        ctx.editMessageText(new_text, {
            reply_markup: {
                inline_keyboard: keyboard
            }
        });
    } else if (command == 'commands') {
        let back_button_text;
        if (args[0] == 'back') back_button_text = '👈 Назад';
        else back_button_text = '👈 Меню'
        ctx.editMessageText(COMMANDS_MESSAGE_TEXT, {
            parse_mode: 'MarkdownV2',
            reply_markup: {
                inline_keyboard: [
                    [ { text: back_button_text, callback_data: 'back:main' } ]
                ]
            }
        });
    } else if (command == 'back') {
        if (args[0] == 'main') {
            let new_text =
                '👋 Ты *администратор*\\.\n' +
                'Чтобы посмотреть команды, нажми на соответствующую кнопку';
            if (ctx.update.callback_query.message.caption) {
                ctx.deleteMessage();
                ctx.reply(new_text, {
                    parse_mode: 'MarkdownV2',
                    reply_markup: {
                        inline_keyboard: [
                            [ { text: '🔐 Приватная группа', callback_data: 'private_group'} ],
                            [ { text: '📂 Каталог', callback_data: 'catalog:back'} ],
                            [ { text: '🛠 Команды', callback_data: 'commands:back' } ]
                        ]
                    }
                })
            } else {
                ctx.editMessageText(new_text, {
                    parse_mode: 'MarkdownV2',
                    reply_markup: {
                        inline_keyboard: [
                            [ { text: '🔐 Приватная группа', callback_data: 'private_group'} ],
                            [ { text: '📂 Каталог', callback_data: 'catalog:back'} ],
                            [ { text: '🛠 Команды', callback_data: 'commands:back' } ]
                        ]
                    }
                });
            }
        } else if (args[0] == 'catalog') {
            let new_text =
                '📂 Каталог';
            let back_button_text;
            if (args[1] == 'back') back_button_text = '👈 Назад';
            else if (args[1] == 'menu') back_button_text = '👈 Меню';
            else back_button_text = '👈 Назад';
            let keyboard = [];
            for (let webinar of data.webinars) {
                keyboard.push([{
                    text: webinar.name + ' (' + webinar.price + 'р.)',
                    callback_data: 'webinar:' + webinar.uid
                }]);
            }
            keyboard.push([{
                text: back_button_text,
                callback_data: 'back:main'
            }]);
            if (ctx.update.callback_query.message.caption) {
                ctx.deleteMessage();
                ctx.reply(new_text, {
                    reply_markup: {
                        inline_keyboard: keyboard
                    }
                });
            } else {
                ctx.editMessageText(new_text, {
                    reply_markup: {
                        inline_keyboard: keyboard
                    }
                });
            }
        } else if (args[0] == 'webinar') {
            let webinar = data.webinars.find(w => w.uid == args[1]);
            if (!webinar) {
                ctx.deleteMessage();
                let reply_text =
                    '❌ Вебинар удалён';
                ctx.reply(reply_text);
            } else {
                let new_text = 
                    '*' + md(webinar.name) + '* \\(' + webinar.price + 'р\\.\\)\n' +
                    (webinar.description ? '\n' + md(webinar.description) + '\n' : '');
                let keyboard = [];
                if (webinar.materials.length) {
                    for (let material in webinar.materials) {
                        keyboard.push([{
                            text: webinar.materials[material].name,
                            callback_data: 'material:' + webinar.uid + ':' + material
                        }]);
                    }
                } else {
                    new_text += '\n❗️ Вы ещё не добавили материал в этот вебинар';
                }
                keyboard.push([{
                    text: '👈 Назад',
                    callback_data: 'back:catalog'
                }]);
                if (webinar.image && ctx.update.callback_query.message.caption) {
                    ctx.editMessageMedia({
                        type: 'photo',
                        media: webinar.image,
                        caption: new_text
                    }, {
                        parse_mode: 'MarkdownV2',
                        reply_markup: {
                            inline_keyboard: keyboard
                        }
                    });
                } else {
                    ctx.deleteMessage();
                    ctx.reply(new_text, {
                        parse_mode: 'MarkdownV2',
                        reply_markup: {
                            inline_keyboard: keyboard
                        }
                    });
                }
            }
        }
    } else if (command == 'webinar') {
        let webinar = data.webinars.find(w => w.uid == args[0]);
        if (!webinar) {
            ctx.deleteMessage();
            let reply_text =
                '❌ Вебинар удалён';
            ctx.reply(reply_text);
        } else {
            let new_text = 
                '*' + md(webinar.name) + '* \\(' + webinar.price + 'р\\.\\)\n' +
                (webinar.description ? '\n' + md(webinar.description) + '\n' : '');
            let keyboard = [];
            if (webinar.materials.length) {
                for (let material in webinar.materials) {
                    keyboard.push([{
                        text: webinar.materials[material].name,
                        callback_data: 'material:' + webinar.uid + ':' + material
                    }]);
                }
            } else {
                new_text += '\n❗️ Вы ещё не добавили материал в этот вебинар';
            }
            keyboard.push([{
                text: '👈 Назад',
                callback_data: 'back:catalog'
            }]);
            if (webinar.image) {
                ctx.deleteMessage();
                ctx.replyWithPhoto(webinar.image, {
                    caption: new_text,
                    parse_mode: 'MarkdownV2',
                    reply_markup: {
                        inline_keyboard: keyboard
                    }
                });
            } else {
                ctx.editMessageText(new_text, {
                    parse_mode: 'MarkdownV2',
                    reply_markup: {
                        inline_keyboard: keyboard
                    }
                });
            }
        }
    } else if (command == 'material') {
        let webinar = data.webinars.find(w => w.uid == args[0]);
        if (!webinar) {
            ctx.deleteMessage();
            let reply_text =
                '❌ Вебинар удалён';
            ctx.reply(reply_text);
        } else {
            let material = webinar.materials[args[1]];
            if (!material) {
                ctx.deleteMessage();
                let reply_text =
                    '❌ Материал удалён';
                ctx.reply(reply_text);
            } else {
                let new_text =
                    '*' + md(material.name) + '*\n' +
                    (material.description ? '\n' + md(material.description) : '');
                if (webinar.image) {
                    ctx.editMessageMedia({
                        type: material.type,
                        media: material.media,
                        caption: new_text,
                    }, {
                        parse_mode: 'MarkdownV2',
                        reply_markup: {
                            inline_keyboard: [
                                [ { text: '👈 Назад', callback_data: 'back:webinar:' + webinar.uid } ]
                            ]
                        }
                    });
                } else {
                    ctx.deleteMessage();
                    if (material.type == 'photo') {
                        ctx.replyWithPhoto(material.media, {
                            caption: new_text,
                            parse_mode: 'MarkdownV2',
                            reply_markup: {
                                inline_keyboard: [
                                    [ { text: '👈 Назад', callback_data: 'back:webinar:' + webinar.uid } ]
                                ]
                            }
                        });
                    } else if (material.type == 'video') {
                        ctx.replyWithVideo(material.media, {
                            caption: new_text,
                            parse_mode: 'MarkdownV2',
                            reply_markup: {
                                inline_keyboard: [
                                    [ { text: '👈 Назад', callback_data: 'back:webinar:' + webinar.uid } ]
                                ]
                            }
                        });
                    } else if (material.type == 'document') {
                        ctx.replyWithDocument(material.media, {
                            caption: new_text,
                            parse_mode: 'MarkdownV2',
                            reply_markup: {
                                inline_keyboard: [
                                    [ { text: '👈 Назад', callback_data: 'back:webinar:' + webinar.uid } ]
                                ]
                            }
                        });
                    }
                }
            }
        }
    }
}

module.exports = handle_callback;