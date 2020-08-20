const fetch = require('node-fetch');
const q = require('@qiwi/bill-payments-node-js-sdk');
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1) ) + min;

const normalize_date_for_form = date => { // Copy-paste form official sdk Qiwi with changing return
    const pad = function (num) {
        let norm = Math.floor(Math.abs(num));
        return (norm < 10 ? '0' : '') + norm;
    };
    return date.getFullYear() +
        '-' + pad(date.getMonth() + 1) +
        '-' + pad(date.getDate()) +
        'T' + pad(date.getHours()) +
        pad(date.getMinutes());
}

const normalize_date_for_create_bill = date => {
    const tzo = -date.getTimezoneOffset();
    const dif = tzo >= 0 ? '+' : '-';
    const pad = function (num) {
        const norm = Math.floor(Math.abs(num));
        return (norm < 10 ? '0' : '') + norm;
    };
    return date.getFullYear() +
        '-' + pad(date.getMonth() + 1) +
        '-' + pad(date.getDate()) +
        'T' + pad(date.getHours()) +
        ':' + pad(date.getMinutes()) +
        ':' + pad(date.getSeconds()) +
        dif + pad(tzo / 60) +
        ':' + pad(tzo % 60);
}

function Qiwi(publicKey, privateKey) {
    if (!publicKey) throw Error('Required first argument - public_key');
    if (!privateKey) throw Error('Required second argument - private_key');
    let PUBLIC_KEY = publicKey;
    let PRIVATE_KEY = privateKey;

    this.create_bill = async function create_bill(billId, options) {
        let res = await fetch('https://api.qiwi.com/partner/bill/v1/bills/' + billId, {
            method: 'PUT',
            headers: {
                'Authorization': 'Bearer ' + PRIVATE_KEY,
                'Content-Type': 'application/json;charset=UTF-8',
                'Accept': 'application/json'
            },
            body: JSON.stringify(options)
        });
        res = await res.json();
        return res;
    }

    this.cancel_bill = async function cancel_bill(billId) {
        let res = await fetch('https://api.qiwi.com/partner/bill/v1/bills/' + billId + '/reject', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + PRIVATE_KEY,
                'Content-Type': 'application/json;charset=UTF-8',
                'Accept': 'application/json'
            },
            body: JSON.stringify({})
        });
        res = await res.json();
        return res;
    }

    this.create_form = function create_form(options) {
        let root_url = 'https://oplata.qiwi.com/create?';
        let params = '';
        for (let option in options) {
            params += `${encodeURIComponent(option)}=${encodeURIComponent(options[option])}&`;
        }
        if (!('publicKey' in options)) params += 'publicKey=' + encodeURIComponent(PUBLIC_KEY);
        return root_url + params;
    }

    this.check_bill = async function check_bill(billId) {
        let res = await fetch('https://api.qiwi.com/partner/bill/v1/bills/' + billId, {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + PRIVATE_KEY,
                'Accept': 'application/json'
            }
        });
        res = await res.json();
        return res;
    }

    this.get_expiration_date_by_day = Qiwi.get_expiration_date_by_day;
    this.get_life_time_by_day = Qiwi.get_life_time_by_day;
    this.generate_id = Qiwi.generate_id;

}

Qiwi.get_life_time_by_day = function get_life_time_by_day(days) { // Copy-paste from oficcial sdk Qiwi
    let date = new Date();
    let time_pulsed = date.getTime() + days * 24 * 60 * 60 * 1000;
    date.setTime(time_pulsed);
    return normalize_date_for_form(date);
}

Qiwi.get_expiration_date_by_day = function get_expiration_date_by_day(days) {
    let date = new Date();
    let time_pulsed = date.getTime() + days * 24 * 60 * 60 * 1000;
    date.setTime(time_pulsed);
    return normalize_date_for_create_bill(date);
}

Qiwi.generate_id = function generate_id() {
    const syms = 'abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let id = '';
    for (let i = 0; i <= 3; i++) {
        for (let i = 0; i < 5; i++) {
            id += syms[rand(0, syms.length - 1)];
        }
        if (i != 3) id += '-';
    }
    return id;
}

module.exports = Qiwi;
