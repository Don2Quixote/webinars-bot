// Because of absence of opportunity to store an empty directories in github:
const fs = require('fs');
if (!fs.existsSync('users')) {
    fs.mkdirSync('users');
}

require('dotenv').config();
const Telegraf = require('telegraf');

const bot = new Telegraf(process.env.TOKEN);

const handle_group_message = require('./handle_group_message');
const handle_admin_message = require('./handle_admin_message');
const handle_user_message = require('./handle_user_message');
bot.on('message', async ctx => {
    if (ctx.message.chat.type == 'group' || ctx.message.chat.type == 'supergroup') {
        await handle_group_message(ctx);
    } else if (ctx.message.chat.type == 'private') {
        if (ctx.from.id == process.env.ADMIN_ID) {
            await handle_admin_message(ctx);
        } else {
            await handle_user_message(ctx);
        }
    }
});

const handle_admin_callback = require('./handle_admin_callback');
const handle_user_callback = require('./handle_user_callback');
bot.on('callback_query', async ctx => {
    if (ctx.from.id == process.env.ADMIN_ID) {
        await handle_admin_callback(ctx);
    } else {
        await handle_user_callback(ctx);
    }
});

bot.launch();

const fs = require('fs');
const Qiwi = require('./qiwi');

const qiwi = new Qiwi(process.env.QIWI_PUBLIC_KEY, process.env.QIWI_PRIVATE_KEY);

const get_user = user_id => {
    try { return JSON.parse(fs.readFileSync('users/' + user_id, 'utf8')) }
    catch (e) { return null }
};
const save_user = user => fs.writeFileSync('users/' + user.id, JSON.stringify(user));
const get_uesrs = () => fs.readdirSync('users');

const get_bills = () => JSON.parse(fs.readFileSync('bills.json', 'utf8'));
const save_bills = bills => fs.writeFileSync('bills.json', JSON.stringify(bills));

const check_bills = async () => {
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
                                bot.telegram.sendMessage(bill.user_id, '✅ Оплата счёта подтверждена');
                                bot.telegram.sendMessage(process.env.ADMIN_ID, '💵 [Пользователь](tg://user?id=' + bill.user_id + ') купил вебинар', {
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
                                    bot.telegram.sendMessage(bill.user_id, '✅ Подписка продлена');
                                    bot.telegram.sendMessage(process.env.ADMIN_ID, '💵 [Пользователь](tg://user?id=' + bill.user_id + ') продил подписку на ' + bill.purchase.days + 'дн\\.', {
                                        parse_mode: 'MarkdownV2'
                                    });
                                } else {
                                    user.subscription = Date.now() + 1000 * 60 * 60 * 24 * bill.purchase.days;
                                    save_user(user);
                                    bills = bills.filter(b => b.user_id != bill.user_id);
                                    if (!link) {
                                        let new_link = await bot.telegram.exportChatInviteLink(process.env.GROUP_ID);
                                        link = new_link;
                                    }
                                    bot.telegram.sendMessage(bill.user_id, '✅ Подписка оформлена', {
                                        reply_markup: {
                                            inline_keyboard: [
                                                [ { text: 'Группа', url: link } ]
                                            ]
                                        }
                                    });
                                    bot.telegram.sendMessage(process.env.ADMIN_ID, '💵 [Пользователь](tg://user?id=' + bill.user_id + ') оформил подписку на ' + bill.purchase.days +' дн\\.', {
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
    setTimeout(check_bills, 1000 * 60); // Check bill once a minute
}

check_bills();

const check_subs = async () => {
    console.log('Checking subs...');
    for (let user_id of get_uesrs()) {
        let user = get_user(user_id);
        if (user.subscription && user.subscription < Date.now()) {
            user.subscription = 0;
            save_user(user);
            bot.telegram.sendMessage(user.id, '🕓 Ваша подписка истекла');
            bot.telegram.sendMessage(process.env.ADMIN_ID, '🕓 У [пользователя](tg://user?id=' + user.id + ') закончилась подписка', {
                parse_mode: 'MarkdownV2'
            });
            try {
                await bot.telegram.kickChatMember(process.env.GROUP_ID, user.id);
                await bot.telegram.unbanChatMember(process.env.GROUP_ID, user.id);
            } catch (e) {
                console.log(e);
            }
        }
    }
    // setTimeout(check_subs, 1000 * 60 * 60); // Check subs once an hour
    setTimeout(check_subs, 1000 * 60);
}

check_subs();
