const fs = require('fs');

const get_data = () => JSON.parse(fs.readFileSync('data.json', 'utf8'));
const save_data = data => fs.writeFileSync('data.json', JSON.stringify(data));

const handle_admin_message = async ctx => {
    let data = get_data();
    if ('text' in ctx.message) {
        let text = ctx.message.text;
        console.log(text);
        if (text == '/start') {
            let reply_text =
                '👋 Ты *администратор*\\.\n' +
                'Чтобы посмотреть команды, нажми на соответствующую кнопку';
            let keyboard = [
                [ { text: '📂 Каталог', callback_data: 'catalog:back'} ],
                [ { text: '🛠 Команды', callback_data: 'commands:back' } ]
            ];
            if (data.faq) {
                keyboard.push([
                    { text: 'ℹ️ FAQ', callback_data: 'faq' }
                ]);
            }
            if (data.access.length) {
                keyboard.unshift([
                    { text: '🔐 Приватный доступ', callback_data: 'private_access' }
                ]);
            }
            ctx.reply(reply_text, {
                parse_mode: 'MarkdownV2',
                reply_markup: {
                    inline_keyboard: keyboard
                }
            });
        } else if (text.slice(0, 4) == '/faq') {
            let [, ...faq_text] = text.split('\n');
            if (!faq_text.length) {
                data.faq = '';
                save_data(data);
                let reply_text =
                    'ℹ️ Текст FAQ удалён';
                ctx.reply(reply_text);
            } else {
                faq_text = faq_text.join('\n');
                data.faq = faq_text;
                save_data(data);
                let reply_text =
                    'ℹ️ Текст FAQ обновлён';
                ctx.reply(reply_text);
            }
        } else if (text.slice(0, 12) == '/add_webinar') {
            let [, name, price, ...description] = text.split('\n');
            if (!name || !price || !description) {
                let reply_text =
                    '❌ Неправильное использование команды';
                ctx.reply(reply_text, {
                    reply_markup: {
                        inline_keyboard: [
                            [ { text: '🛠 Команды', callback_data: 'commands:menu' } ]
                        ]
                    }
                });
            } else if (isNaN(price) || parseFloat(price) != parseInt(price)) {
                let reply_text =
                    '❌ Стоимость вебинара должна быть целым числом';
                ctx.reply(reply_text, {
                    reply_markup: {
                        inline_keyboard: [
                            [ { text: '🛠 Команды', callback_data: 'commands:menu' } ]
                        ]
                    }
                });
            } else {
                data.webinars.push({
                    uid: ++data.last_uid,
                    name: name,
                    image: null,
                    price: parseInt(price),
                    description: description.join('\n'),
                    materials: []
                });
                save_data(data);
                let reply_text =
                    '✅ Вебинар добавлен';
                ctx.reply(reply_text, {
                    reply_markup: {
                        inline_keyboard: [
                            [ { text: '📂 Каталог', callback_data: 'catalog:menu'} ],
                        ]
                    }
                });
            }
        } else if (text.slice(0, 13) == '/add_material') {
            let reply_text =
                '❌ Вы должны прикрепить картинку/документ/видео к сообщению';
            ctx.reply(reply_text, {
                reply_markup: {
                    inline_keyboard: [
                        [ { text: '🛠 Команды', callback_data: 'commands:menu' } ]
                    ]
                }
            });
        } else if (text.slice(0, 15) == '/remove_webinar') {
            if (!text.split(' ').length || text.split('\n').length > 1) {
                let reply_text =
                    '❌ Неправильное использование команды';
                ctx.reply(reply_text, {
                    reply_markup: {
                        inline_keyboard: [
                            [ { text: '🛠 Команды', callback_data: 'commands:menu' } ]
                        ]
                    }
                });
            } else {
                let webinar_name = text.split(' ').slice(1).join(' ')
                let webinar = data.webinars.find(w => w.name == webinar_name);
                if (webinar) {
                    data.webinars = data.webinars.filter(w => w.name != webinar_name);
                    save_data(data);
                    let reply_text =
                        '✅ Вебинар удалён';
                    ctx.reply(reply_text, {
                        reply_markup: {
                            inline_keyboard: [
                                [ { text: '📂 Каталог', callback_data: 'catalog:menu' } ]
                            ]
                        }
                    });
                } else {
                    let reply_text =
                        '❌ Вы не добавляли вебинар с таким названием';
                    ctx.reply(reply_text, {
                        reply_markup: {
                            inline_keyboard: [
                                [ { text: '📂 Каталог', callback_data: 'catalog:menu' } ]
                            ]
                        }
                    });
                }
            }
        } else if (text.slice(0, 16) == '/remove_material') {
            let [, webinar_name, material_name] = text.split('\n');
            if (!webinar_name || !material_name) {
                let reply_text =
                    '❌ Неправильное использование команды';
                ctx.reply(reply_text, {
                    reply_markup: {
                        inline_keyboard: [
                            [ { text: '🛠 Команды', callback_data: 'commands:menu' } ]
                        ]
                    }
                });
            } else {
                let webinar = data.webinars.find(w => w.name == webinar_name);
                if (webinar) {
                    let material = webinar.materials.find(m => m.name);
                    if (material) {
                        webinar.materials = webinar.materials.filter(m => m.name != material_name);
                        save_data(data);
                        let reply_text =
                            '✅ Материал удалён';
                        ctx.reply(reply_text, {
                            reply_markup: {
                                inline_keyboard: [
                                    [ { text: '📂 Каталог', callback_data: 'catalog:menu' } ]
                                ]
                            }
                        });
                    } else {
                        let reply_text =
                            '❌ В указанном вебинаре нет материала с таким названием';
                        ctx.reply(reply_text, {
                            reply_markup: {
                                inline_keyboard: [
                                    [ { text: '📂 Каталог', callback_data: 'catalog:menu' } ]
                                ]
                            }
                        });
                    }
                } else {
                    let reply_text =
                        '❌ Вы не добавляли вебинар с таким названием';
                    ctx.reply(reply_text, {
                        reply_markup: {
                            inline_keyboard: [
                                [ { text: '📂 Каталог', callback_data: 'catalog:menu' } ]
                            ]
                        }
                    });
                }
            }
        } else if (text.slice(0, 12) == '/add_channel') {
            let [, chat_id, name, price_per_day ] = text.split('\n');
            if (data.access.find(chat => chat.chat_id == chat_id)) {
                ctx.reply('❌Вы уже добавили этот канал');
            } else if (!price_per_day || isNaN(price_per_day)) {
                ctx.reply('❌Неправильное использование команды');
            } else {
                let chat;
                try {
                    chat = await ctx.telegram.getChat(chat_id);
                } catch(e) {}
                if (!chat) {
                    ctx.reply('❌ Меня нет в этом канале');
                } else if (chat.type != 'channel') {
                    ctx.reply('❌ Это не канал');
                } else {
                    data.access.push({
                        type: 'channel',
                        chat_id,
                        name,
                        price_per_day
                    });
                    save_data(data);
                    let reply_text =
                        '✅ Канал добавлен';
                    ctx.reply(reply_text);
                }
            }
        } else if (text.slice(0, 10) == '/add_group') {
            let [, chat_id, name, price_per_day ] = text.split('\n');
            if (data.access.find(chat => chat.chat_id == chat_id)) {
                ctx.reply('❌Вы уже добавили эту группу');
            } else if (!price_per_day || isNaN(price_per_day)) {
                ctx.reply('❌Неправильное использование команды');
            } else {
                let chat;
                try {
                    chat = await ctx.telegram.getChat(chat_id);
                } catch(e) {}
                if (!chat) {
                    ctx.reply('❌ Меня нет в этой группе');
                } else if (chat.type != 'supergroup') {
                    ctx.reply('❌ Это не группа');
                } else {
                    data.access.push({
                        type: 'group',
                        chat_id,
                        name,
                        price_per_day
                    });
                    save_data(data);
                    let reply_text =
                        '✅ Группа добавлен';
                    ctx.reply(reply_text);
                }
            }
        } else if (text.slice(0, 15) == '/remove_channel') {
            let [, ...name] = text.split(' ');
	    name = name.join(' ');
            if (data.access.find(chat => chat.name == name)) {
                data.access = data.access.filter(chat => chat.name != name && chat.type == 'channel');
                save_data(data);
                ctx.reply('✅ Канал удалён'); 
            } else {
                ctx.reply('❌ Вы не добавили этот канал');
            }
        } else if (text.slice(0, 13) == '/remove_group') {
            let [, ...name] = text.split(' ');
	    name = name.join(' ');
            if (data.access.find(chat => chat.name == name)) {
                data.access = data.access.filter(chat => chat.name != name && chat.type == 'group');
                save_data(data);
                ctx.reply('✅ Группа удалена'); 
            } else {
                ctx.reply('❌ Вы не добавили эту группу');
            }
        } else if (text.slice(0, 1) == '/') {
            let reply_text =
                '❌ Неизвестная команда';
            ctx.reply(reply_text, {
                reply_markup: {
                    inline_keyboard: [
                        [ { text: '🛠 Команды', callback_data: 'commands:menu' } ]
                    ]
                }
            });
        }
    } else if ('caption' in ctx.message) {
        let caption = ctx.message.caption;
        console.log(caption);
        if (caption.slice(0, 12) == '/add_webinar') {
            let [, name, price, ...description] = caption.split('\n');
            if (!name || !price || !description) {
                let reply_text =
                    '❌ Неправильное использование команды';
                ctx.reply(reply_text, {
                    reply_markup: {
                        inline_keyboard: [
                            [ { text: '🛠 Команды', callback_data: 'commands:menu' } ]
                        ]
                    }
                });
            } else if (isNaN(price) || parseFloat(price) != parseInt(price)) {
                let reply_text =
                    '❌ Стоимость вебинара должна быть целым числом';
                ctx.reply(reply_text, {
                    reply_markup: {
                        inline_keyboard: [
                            [ { text: '🛠 Команды', callback_data: 'commands:menu' } ]
                        ]
                    }
                });
            } else {
                data.webinars.push({
                    uid: ++data.last_uid,
                    name: name,
                    image: ctx.message.photo ? ctx.message.photo[0].file_id : null,
                    price: parseInt(price),
                    description: description.join('\n'),
                    materials: []
                });
                save_data(data);
                let reply_text =
                    '✅ Вебинар добавлен';
                ctx.reply(reply_text, {
                    reply_markup: {
                        inline_keyboard: [
                            [ { text: '📂 Каталог', callback_data: 'catalog:menu'} ],
                        ]
                    }
                });
            }
        } else if (caption.slice(0, 13) == '/add_material') {
            if (!ctx.message.photo && !ctx.message.video && !ctx.message.document) {
                let reply_text =
                    '❌ Стоимость вебинара должна быть целым числом';
                ctx.reply(reply_text, {
                    reply_markup: {
                        inline_keyboard: [
                            [ { text: '🛠 Команды', callback_data: 'commands:menu' } ]
                        ]
                    }
                });
            }
            let [, webinar_name, material_name, ...description] = caption.split('\n');

            if (!webinar_name || !material_name) {
                let reply_text =
                    '❌ Неправильное использование команды';
                ctx.reply(reply_text, {
                    reply_markup: {
                        inline_keyboard: [
                            [ { text: '🛠 Команды', callback_data: 'commands:menu' } ]
                        ]
                    }
                });
            } else {
                let webinar = data.webinars.find(w => w.name == webinar_name);
                if (!webinar) {
                    let reply_text =
                        '❌ Вы не добавляли вебинар с таким названием';
                    ctx.reply(reply_text, {
                        reply_markup: {
                            inline_keyboard: [
                                [ { text: '🛠 Команды', callback_data: 'commands:menu' } ]
                            ]
                        }
                    });
                } else {
                    let material = webinar.materials.find(m => m.name == material_name);
                    if (!material) {
                        webinar.materials.push({
                            name: material_name,
                            type: ctx.message.photo ? 'photo' : ctx.message.video ? 'video' : 'document',
                            media: ctx.message.photo ? ctx.message.photo[0].file_id :
                                ctx.message.video ? ctx.message.video.file_id :
                                ctx.message.document.file_id,
                            description: description.join('\n')
                        });
                        save_data(data);
                        let reply_text =
                            '✅ Новый материал добавлен в вебинар';
                        ctx.reply(reply_text, {
                            reply_markup: {
                                inline_keyboard: [
                                    [ { text: '📒 Вебинар', callback_data: 'webinar:' + webinar.uid } ]
                                ]
                            }
                        });
                    } else {
                        material.type = ctx.message.photo ? 'photo' : ctx.message.video ? 'video' : 'document';
                        material.media = ctx.message.photo ? ctx.message.photo[0].file_id :
                            ctx.message.video ? ctx.message.video.file_id :
                            ctx.message.document.file_id;
                        material.description = description.join('\n');
                        save_data(data);
                        let reply_text =
                            '✅ Материал в вебинаре изменён';
                        ctx.reply(reply_text, {
                            reply_markup: {
                                inline_keyboard: [
                                    [ { text: '📒 Вебинар', callback_data: 'webinar:' + webinar.uid } ]
                                ]
                            }
                        });
                    }
                }
            }
        }
    }
}

module.exports = handle_admin_message;
