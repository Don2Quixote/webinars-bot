const fs = require('fs');
const Qiwi = require('./qiwi');
const md = require('./md_friendly');

const qiwi = new Qiwi(process.env.QIWI_PUBLIC_KEY, process.env.QIWI_PRIVATE_KEY);

const get_user = user_id => {
    try { return JSON.parse(fs.readFileSync('users/' + user_id, 'utf8')) }
    catch (e) { return null }
};
const save_user = user => fs.writeFileSync('users/' + user.id, JSON.stringify(user));

const get_bills = () => JSON.parse(fs.readFileSync('bills.json', 'utf8'));
const save_bills = bills => fs.writeFileSync('bills.json', JSON.stringify(bills));

const handle_private_message = async ctx => {
    let user = get_user(ctx.from.id);
    if (!user) {
        user = {
            id: ctx.from.id,
            webinars: [],
            subscription: 0,
        };
        save_user(user);
        let reply_text =
            '👋 *Добро пожаловать*\\. Выберите, что вас интересует\\.';
        ctx.reply(reply_text, {
            parse_mode: 'MarkdownV2',
            reply_markup: {
                inline_keyboard: [
                    [ { text: '🔐 Приватная группа', callback_data: 'private_group'} ],
                    [ { text: '📂 Каталог', callback_data: 'catalog:back'} ],
                    [ { text: '✉️ Связаться', url: 't.me/don2quixote' } ]
                ]
            }
        });
        return;
    }

    if (ctx.message.text && !isNaN(ctx.message.text) && parseInt(ctx.message.text) == parseFloat(ctx.message.text)) {
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
        } else {
            let days = parseInt(ctx.message.text);
            if (days < 1 || days > 180) {
                let reply_text =
                    '❌ Число должно быть больше 0 и меньше 180';
                ctx.reply(reply_text);
            } else {
                let text_days = '';
                switch (days) {
                    case 11:
                    case 12:
                    case 13: 
                    case 14:
                        text_days = 'дней';
                        break;
                    default: {
                        switch (days % 10) {
                            case 1:
                                text_days = 'день';
                                break;
                            case 2:
                            case 3:
                            case 4:
                                text_days = 'дня';
                                break;
                            case 5:
                            case 6:
                            case 7:
                            case 8:
                            case 9:
                            case 0:
                                text_days = 'дней';
                                break;
                        }
                    }
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
                    ctx.reply('❌ Ошибка создания счёта');
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
                let reply_text =
                    '🔐 Доступ к приватной группе\\.\n' +
                    '*' + days + '* ' + text_days + ' \\- *' + days * process.env.PRICE_PER_DAY + '*р\\.';
                ctx.reply(reply_text, {
                    parse_mode: 'MarkdownV2',
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: '👉 Оплатить', url: form_url },
                                { text: '❌ Отмена', callback_data: 'cancel_bill' }
                            ]
                        ]
                    }
                });
            }
        }
    } else {
        let reply_text =
            '👋 *Добро пожаловать*\\. Выберите, что вас интересует\\.';
        ctx.reply(reply_text, {
            parse_mode: 'MarkdownV2',
            reply_markup: {
                inline_keyboard: [
                    [ { text: '🔐 Приватная группа', callback_data: 'private_group'} ],
                    [ { text: '📂 Каталог', callback_data: 'catalog:back'} ],
                    [ { text: '✉️ Связаться', url: 't.me/don2quixote' } ]
                ]
            }
        });
    }
}

module.exports = handle_private_message;