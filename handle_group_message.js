const fs = require('fs');

const get_user = user_id => {
    try { return JSON.parse(fs.readFileSync('users/' + user_id, 'utf8')) }
    catch (e) { return null }
};
const save_user = user => fs.writeFileSync('users/' + user.id, JSON.stringify(user));

const handle_group_message = async ctx => {
    if (ctx.message.new_chat_members) {
        for (let new_member of ctx.message.new_chat_members) {
            let user = get_user(new_member.id);
            if (!user || !user.subscription) {
                if (new_member.id != process.env.ADMIN_ID) {
                    try {
                        await ctx.telegram.kickChatMember(process.env.GROUP_ID, new_member.id);
                    } catch (e) {
                        console.log(e);
                    }
                }
            }
        }
    }
}

module.exports = handle_group_message;