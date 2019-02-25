var { execPromise} = require('../../helpers/_exec');
const dockerrm = async (name)=>{
        try{
            await execPromise(`docker rm -f ${name}`);
        }
        catch(e){
            
        }
}
module.exports = async(args)=>{
    if(args.creator !== 'eosio')
        return; // only local    
    await dockerrm("zeus-keosd");
    await execPromise(`docker run --rm --name zeus-keosd -p 8900:8900 --rm -d eosio/eos-dev:v1.3.1 /bin/bash -c "keosd --http-server-address=0.0.0.0:8900 --http-validate-host=false"`);
};