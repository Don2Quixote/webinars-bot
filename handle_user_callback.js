const fs = require('fs');
const Qiwi = require('./qiwi');
const md = require('./md_friendly');

const qiwi = new Qiwi(process.env.QIWI_PUBLIC_KEY, process.env.QIWI_PRIVATE_KEY);

const get_data = () => JSON.parse(fs.readFileSync('data.json', 'utf8'));
const save_data = data => fs.writeFileSync('data.json', JSON.stringify(data));

const get_user = user_id => {
    try { return JSON.parse(fs.readFileSync('users/' + user_id, 'utf8')) }
    catch (e) { return null }
};
const save_user = user => fs.writeFileSync('users/' + user.id, JSON.stringify(user));

const get_bills = () => JSON.parse(fs.readFileSync('bills.json', 'utf8'));
const save_bills = bills => fs.writeFileSync('bills.json', JSON.stringify(bills));

const check_bills = async ctx => {
    let link;
    let bills = get_bills();
    for (let bill of bills) {
        try {
            let bill_info = await qiwi.check_bill(bill.id);
            console.log(bill_info);
            if (bill_info.status && bill_info.status.value) {
                if (bill_info.status.value == 'PAID') {
                    let user = get_user(bill.user_id);
                    if (!user) {
                        bills = bills.filter(b => b.user_id != bill.user_id);
                    } else {
                        if (bill.purchase.type == 'webinar') {
                            if (parseInt(bill_info.amount.value) == bill.amount) {
                                user.webinars.push(bill.purchase.webinar);
                                save_user(user);
                                bills = bills.filter(b => b.user_id != bill.user_id);
                                ctx.telegram.sendMessage(bill.user_id, '✅ Оплата счёта подтверждена');
                                ctx.telegram.sendMessage(process.env.ADMIN_ID, '💵 [Пользователь](tg://user?id=' + bill.user_id + ') купил вебинар', {
                                    parse_mode: 'MarkdownV2'
                                });
                            } else {
                                bills = bills.filter(b => b.user_id != bill.user_id);
                            }
                        } else if (bill.purchase.type == 'subscribe') {
                            if (parseInt(bill_info.amount.value) == bill.amount) {
                                if (user.subscription) {
                                    user.subscription += 1000 * 60 * 60 * 24 * bill.purchase.days;
                                    save_user(user);
                                    bills = bills.filter(b => b.user_id != bill.user_id);
                                    ctx.telegram.sendMessage(bill.user_id, '✅ Подписка продлена');
                                    ctx.telegram.sendMessage(process.env.ADMIN_ID, '💵 [Пользователь](tg://user?id=' + bill.user_id + ') продил подписку на ' + bill.purchase.days + 'дн\\.', {
                                        parse_mode: 'MarkdownV2'
                                    });
                                } else {
                                    user.subscription = Date.now() + 1000 * 60 * 60 * 24 * bill.purchase.days;
                                    save_user(user);
                                    bills = bills.filter(b => b.user_id != bill.user_id);
                                    if (!link) {
                                        let new_link = await ctx.telegram.exportChatInviteLink(process.env.GROUP_ID);
                                        link = new_link;
                                        console.log(link);
                                    }
                                    ctx.telegram.sendMessage(bill.user_id, '✅ Подписка оформлена', {
                                        reply_markup: {
                                            inline_keyboard: [
                                                [ { text: 'Группа', url: link } ]
                                            ]
                                        }
                                    });
                                    ctx.telegram.sendMessage(process.env.ADMIN_ID, '💵 [Пользователь](tg://user?id=' + bill.user_id + ') оформил подписку на ' + bill.purchase.days +' дн\\.', {
                                        parse_mode: 'MarkdownV2'
                                    });
                                }
                            } else {
                                bills = bills.filter(b => b.user_id != bill.user_id);
                            }
                        }
                    }
                } else if (bill_info.status.value == 'EXPIRED' || bill_info.status.value == 'REJECTED') {
                    bills = bills.filter(b => b.user_id != bill.user_id);
                } else if (bill_info.status.value == 'WAITING') {
                    if (bill_info.payUrl) {
                        bill.url = bill_info.payUrl;
                    }
                }
            }
        } catch (e) {
            console.log('Incorrect Qiwi credentials or servers are unabailable');
            console.log(e);
        }
    }
    save_bills(bills);
}

const handle_callback = async ctx => {
    let [command, ...args] = ctx.update.callback_query.data.split(':');
    console.log(command, args);

    let data = get_data();
    let user = get_user(ctx.from.id);
    if (!user) return;
    if (command == 'private_group') {
        let new_text =
            '🔐 Чтобы получить доступ к приватной группе, оплатите один из представленных тарифов. Если вы хотите указать другое количество дней - пришлите боту цифру (Не более 180).';
        ctx.editMessageText(new_text, {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '1 день', callback_data: 'subscribe:1' },
                        { text: '7 дней', callback_data: 'subscribe:7' },
                        { text: '30 дней', callback_data: 'subscribe:30' },
                    ],
                    [ { text: '👈 Назад', callback_data: 'back:main' } ]
                ]
            }
        });
    } else if (command == 'catalog') {
        let new_text =
            '📂 Каталог';
        let back_button_text;
        if (args[0] == 'back') back_button_text = '👈 Назад';
        else back_button_text = '👈 Меню'
        let keyboard = [];
        for (let webinar of data.webinars) {
            keyboard.push([{
                text: webinar.name + (!user.webinars.includes(webinar.uid) ? '(' + webinar.price + 'р.)' : ''),
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
    } else if (command == 'back') {
        if (args.includes('cancel_bill')) {
            await check_bills(ctx);
            let bills = get_bills();
            bills = bills.filter(b => b.user_id != ctx.from.id);
            save_bills(bills);
        }
        if (args[0] == 'main') {
            let new_text =
                '👋 *Добро пожаловать*\\. Выберите, что вас интересует\\.';
            if (ctx.update.callback_query.message.caption) {
                ctx.deleteMessage();
                ctx.reply(new_text, {
                    parse_mode: 'MarkdownV2',
                    reply_markup: {
                        inline_keyboard: [
                            [ { text: '🔐 Приватная группа', callback_data: 'private_group'} ],
                            [ { text: '📂 Каталог', callback_data: 'catalog:back'} ],
                            [ { text: '✉️ Связаться', url: 'tg://user?id=' + process.env.ADMIN_ID } ]
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
                            [ { text: '✉️ Связаться', url: 'tg://user?id=' + process.env.ADMIN_ID } ]
                        ]
                    }
                });
            }
        } else if (args[0] == 'private_group') {
            let new_text =
                '🔐 Чтобы получить доступ к приватной группе, оплатите один из представленных тарифов. Если вы хотите указать другое количество дней - пришлите боту цифру (Не более 180).';
            ctx.editMessageText(new_text, {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '1 день', callback_data: 'subscribe:1' },
                            { text: '7 дней', callback_data: 'subscribe:7' },
                            { text: '30 дней', callback_data: 'subscribe:30' },
                        ],
                        [ { text: '👈 Назад', callback_data: 'back:main' } ]
                    ]
                }
            });
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
                    text: webinar.name + (!user.webinars.includes(webinar.uid) ? '(' + webinar.price + 'р.)' : ''),
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
                    '*' + md(webinar.name) + '* ' + (!user.webinars.includes(webinar.uid) ? '\\(' + webinar.price + 'р\\.\\)' : '') + '\n' +
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
                    new_text += '\n❗️ В этот вебинар пока не добавлен материал';
                }
                let add_keyboard_row = [{
                    text: '👈 Назад',
                    callback_data: 'back:catalog'
                }];
                if (!user.webinars.includes(webinar.uid)) {
                    add_keyboard_row.push({
                        text: '🛒 Купить',
                        callback_data: 'buy:' + webinar.uid
                    });
                }
                keyboard.push(add_keyboard_row);
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
                } else if (!webinar.image && ctx.update.callback_query.message.text) {
                    ctx.editMessageText(new_text, {
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
                '*' + md(webinar.name) + '* ' + (!user.webinars.includes(webinar.uid) ? '\\(' + webinar.price + 'р\\.\\)' : '') + '\n' +
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
                new_text += '\n❗️ В этот вебинар пока не добавлен материал';
            }
            let add_keyboard_row = [{
                text: '👈 Назад',
                callback_data: 'back:catalog'
            }];
            if (!user.webinars.includes(webinar.uid)) {
                add_keyboard_row.push({
                    text: '🛒 Купить',
                    callback_data: 'buy:' + webinar.uid
                });
            }
            keyboard.push(add_keyboard_row);
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
        } else if (!user.webinars.includes(webinar.uid)) {
            ctx.answerCbQuery('❌ Необходимо оплатить доступ');
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
    } else if (command == 'buy') {
        let bills = get_bills();
        let active_bill = bills.find(b => b.user_id == ctx.from.id);
        if (active_bill) {
            let reply_text =
                'ℹ️ У вас есть неоплаченный счёт. Вам нужно его оплатить или отменить';
            ctx.reply(reply_text, {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '👉 Оплатить', url: active_bill.url },
                            { text: '❌ Отменить', callback_data: 'cancel_bill' }
                        ]
                    ]
                }
            });
            ctx.answerCbQuery('');
        } else {
            let webinar = data.webinars.find(w => w.uid == parseInt(args[0]));
            if (!webinar) {
                ctx.answerCbQuery('❌ Вебинар удалён');
            } else if (user.webinars.includes(parseInt(args[0]))) {
                ctx.answerCbQuery('ℹ️ Вы уже купили этот вебинар');
            } else {
                let new_text =
                    'ℹ️ К оплате ' + webinar.price + 'р.';
                let billId = qiwi.generate_id();
                let expirationDateTime = qiwi.get_expiration_date_by_day(1 / 24); // 1 Hour to pay
                let options = {
                    amount: {
                        currency: 'RUB',
                        value: parseFloat(webinar.price).toFixed(2),
                    },
                    expirationDateTime: expirationDateTime,
                    customer: {
                        account: ctx.from.id.toString()
                    }
                }
                if (process.env.THEME_CODE) {
                    if (!options.customFields) options.customFields = {};
                    options.customFields.themeCode = process.env.THEME_CODE;
                }
                let bill_info;
                try {
                    bill_info = await qiwi.create_bill(billId, options);
                } catch (e) {
                    ctx.answerCbQuery('Ошибка создания счёта');
                    console.log(e);
                }
                let form_url = bill_info.payUrl;
                bills.push({
                    id: billId,
                    amount: webinar.price,
                    user_id: ctx.from.id,
                    purchase: {
                        type: 'webinar',
                        webinar: webinar.uid
                    },
                    url: form_url
                });
                save_bills(bills);
                if (webinar.image) {
                    ctx.deleteMessage();
                    ctx.reply(new_text, {
                        reply_text: {
                            inline_keyboard: [
                                [ 
                                    { text: '👉 Оплатить', url: form_url },
                                    { text: '❌ Омена', callback_data: 'back:webinar:' + args[0] + ':cancel_bill' }
                                ]
                            ]
                        }
                    });
                } else {
                    ctx.editMessageText(new_text, {
                        reply_markup: {
                            inline_keyboard: [
                                [ 
                                    { text: '👉 Оплатить', url: form_url },
                                    { text: '❌ Омена', callback_data: 'back:webinar:' + args[0] + ':cancel_bill' }
                                ]
                            ]
                        }
                    });
                }
            }
        }
    } else if (command == 'subscribe') {
        let bills = get_bills();
        let active_bill = bills.find(b => b.user_id == ctx.from.id);
        if (active_bill) {
            let reply_text =
                'ℹ️ У вас есть неоплаченный счёт. Вам нужно его оплатить или отменить';
            ctx.reply(reply_text, {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '👉 Оплатить', url: active_bill.url },
                            { text: '❌ Отменить', callback_data: 'cancel_bill' }
                        ]
                    ]
                }
            });
            ctx.answerCbQuery('');
        } else {
            let days = parseInt(args[0]);
            let text_days = '';
            switch (days) {
                case 1:
                    text_days = 'день';
                    break;
                case 7:
                case 30:
                    text_days = 'дней';
                    break;
                default: return;
            }
            let billId = qiwi.generate_id();
            let expirationDateTime = qiwi.get_expiration_date_by_day(1 / 24); // 1 Hour to pay
            let options = {
                amount: {
                    currency: 'RUB',
                    value: parseFloat(process.env.PRICE_PER_DAY * days).toFixed(2),
                },
                expirationDateTime: expirationDateTime,
                customer: {
                    account: ctx.from.id.toString()
                }
            }
            if (process.env.THEME_CODE) {
                if (!options.customFields) options.customFields = {};
                options.customFields.themeCode = process.env.THEME_CODE;
            }
            let bill_info;
            try {
                bill_info = await qiwi.create_bill(billId, options);
            } catch (e) {
                ctx.answerCbQuery('Ошибка создания счёта');
                console.log(e);
            }
            let form_url = bill_info.payUrl;
            bills.push({
                id: billId,
                amount: process.env.PRICE_PER_DAY * days,
                user_id: ctx.from.id,
                purchase: {
                    type: 'subscribe',
                    days: days
                },
                url: form_url
            });
            save_bills(bills);
            let new_text =
                '🔐 Доступ к приватной группе\\.\n' +
                '*' + days + '* ' + text_days + ' \\- *' + days * process.env.PRICE_PER_DAY + '*р\\.';
            ctx.editMessageText(new_text, {
                parse_mode: 'MarkdownV2',
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '👉 Оплатить', url: form_url },
                            { text: '❌ Отмена', callback_data: 'back:private_group:cancel_bill' }
                        ]
                    ]
                }
            });
        }
    } else if (command == 'cancel_bill') {
        let bills = get_bills();
        let bill = bills.find(b => b.user_id == ctx.from.id);
        if (bill) {
            await check_bills(ctx);
            bills = bills.filter(b => b.user_id != ctx.from.id);
            save_bills(bills);
            await ctx.answerCbQuery('ℹ️ Счёт отменён');
            ctx.deleteMessage();
        } else {
            await ctx.answerCbQuery('ℹ️ У вас нет неоплаченных счетов');
            ctx.deleteMessage();
        }
    }
}

module.exports = handle_callback;