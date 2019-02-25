const { createWallet } = require('../../tools/eos/wallet');

module.exports = async(args) => {
    if (args.creator !== 'eosio')
        return; // only local        
    await createWallet(args);
};
