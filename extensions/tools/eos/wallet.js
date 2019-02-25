const crypto = require('crypto');
const prompt = require('prompt');
const path = require('path');
const fs = require('fs');
const { cleos } = require('./utils');
const chalk = require('chalk');
var { execPromise } = require('../../helpers/_exec');

const algorithm = 'aes256';
const inputEncoding = 'utf8';
const outputEncoding = 'hex';
var mkdirp = require('mkdirp').sync;

const prompt_props = {
    properties: {
        password: {
            hidden: true
        }
    }
};
const rm = async(path) => {
    try {
        await execPromise(`rm -rf ${path}`);
    }
    catch (e) {

    }
}
async function createWallet(args) {
    const { wallet, storagePath, network } = args;
    await rm('~/eosio-wallet/zeus.wallet');
    let stdout = await cleos(`wallet create --to-console -n ${wallet}`, { network });
    await cleos(`wallet import --private-key ${args.creatorKey} -n ${args.wallet}`, args);
    stdout = stdout.split('\n')[3];
    const pwd = stdout.substr(1, stdout.length - 2);
    const pwd_dir = getPwdDirPath(storagePath, network);
    // generate dir
    if (network === 'development') {
        if (!fs.existsSync(pwd_dir)) {
            mkdirp(pwd_dir);
        }
        return fs.writeFileSync(path.resolve(pwd_dir, wallet), pwd);
    }

    console.log(chalk.green("choose a password to encrypt the wallet\'s passsword\n"));
    prompt.start();
    prompt.get(prompt_props, async(err, result) => {
        const ciphered = encrypt(pwd, result.password);
        if (!fs.existsSync(pwd_dir)) {
            mkdirp(pwd_dir);
        }
        fs.writeFileSync(path.resolve(pwd_dir, wallet), ciphered);
    });

}

function getPwdDirPath(storagePath, network) {
    return path.resolve(storagePath, 'networks', network);
}

async function unlockWallet(wallet, network, storagePath) {
    const dir = getPwdDirPath(storagePath, network);
    if (network === 'development') {
        const pwd = fs.readFileSync(path.resolve(dir, wallet)).toString();
        try {
            await cleos(`wallet unlock -n ${wallet} --password ${pwd}`, { network });
        }
        catch (e) {
            return console.error(chalk.red('Wallet already unlocked'));
        }
        return console.log(chalk.green(`Wallet '${wallet}' unlocked`));
    }

    console.log(chalk.green("enter password to unlock the wallet\n"));
    prompt.start();
    prompt.get(prompt_props, async(err, result) => {
        const cipher = fs.readFileSync(path.resolve(dir, wallet)).toString();
        let walletPwd;
        try {
            walletPwd = decrypt(wallet, cipher, result.password);
        }
        catch (e) {
            return console.error(chalk.red('Wrong password!'));
        }
        try {
            await cleos(`wallet unlock -n ${wallet} --password ${walletPwd}`, { network });
        }
        catch (e) {
            return console.error(chalk.red('Wallet already unlocked'));
        }
        console.log(chalk.green(`Wallet '${wallet}' unlocked`));
    });
}


function encrypt(text, key) {
    const cipher = crypto.createCipher(algorithm, key);
    let ciphered = cipher.update(text, inputEncoding, outputEncoding);
    ciphered += cipher.final(outputEncoding);
    return ciphered;
}

function decrypt(wallet, cipher, key) {
    const decipher = crypto.createDecipher(algorithm, key);
    let deciphered = decipher.update(cipher, outputEncoding, inputEncoding);
    deciphered += decipher.final(inputEncoding);
    return deciphered;
}


module.exports = {
    createWallet,
    encrypt,
    decrypt,
    unlockWallet
};
