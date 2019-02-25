var {execPromise} = require('../../helpers/_exec');
const dockerrm = async (name)=>{
        try{
            await execPromise(`docker rm -f ${name}`);
        }
        catch(e){
            
        }
}
module.exports = async (args)=>{
    await dockerrm("zeus-pp");
    await execPromise(`docker run -u $(id -u \$USER) --rm --name zeus-pp -i -v $PWD/contracts/eos:/contracts tmuskal/eosio.cdt g++ -std=c++17 -E -I/usr/local/eosio.cdt/include $CODE/$CODE.cpp  > contracts/eos/$CODE/$CODE.full.cpp && docker run -u $(id -u \$USER) --rm --name zeus-pp2 -i -v $PWD/contracts/eos:/contracts tmuskal/eosio.cdt clang-format -i /contracts/$CODE/$CODE.full.cpp`,{
        env:{...process.env, CODE: args.contract}
    });
}
