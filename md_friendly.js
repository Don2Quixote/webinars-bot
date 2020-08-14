module.exports = function md_friendly(str) {
    return str
        .replace(/[_]/g, '\\_')
        .replace(/[*]/g, '\\*')
        .replace(/[\[]/g, '\\[')
        .replace(/[\]]/g, '\\]')
        .replace(/[\(]/g, '\\(')
        .replace(/[\)]/g, '\\)')
        .replace(/[~]/g, '\\~')
        .replace(/[`]/g, '\\`')
        .replace(/[>]/g, '\\>')
        .replace(/[#]/g, '\\#')
        .replace(/[+]/g, '\\+')
        .replace(/[-]/g, '\\-')
        .replace(/[=]/g, '\\=')
        .replace(/[|]/g, '\\|')
        .replace(/[{]/g, '\\{')
        .replace(/[}]/g, '\\}')
        .replace(/[\.]/g, '\\.')
        .replace(/[!]/g, '\\!');
}