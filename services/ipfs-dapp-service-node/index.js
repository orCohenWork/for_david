var {nodeFactory} = require('../dapp-services-node/generic-dapp-service-node');
var IPFS = require('ipfs-api');
var ipfs;

if(process.env.IPFS_HOST)
     ipfs = new IPFS({ host: process.env.IPFS_HOST, port: 5001, protocol: 'http' });
else
     ipfs = new IPFS({ host:'ipfs.infura.io', port: 5001, protocol: 'https' });
    
const saveToIPFS = async(data)=>{
    // console.log('writing data: ' +data);
    const filesAdded = await ipfs.files.add(Buffer.from(data,'hex'),{'raw-leaves':true,'cid-version':1});
    var theHash = filesAdded[0].hash;
    console.log('commited to: ipfs://' +theHash);
    return `ipfs://${theHash}`;
}

const readFromIPFS = async(uri)=>{
    console.log('getting', uri)
    const fileName = uri.split('ipfs://',2)[1];
    var res = await ipfs.files.get(fileName);
    // console.log('got', res);
    return Buffer.from(res[0].content);
}

nodeFactory('ipfs',{
    commit: async (request, {data}) => {
        return {
            uri: await saveToIPFS(data),
            size: data.length/2,
        };
    },
    warmup: async (request, {uri}) => {
        
        var data = await readFromIPFS(uri);
        // console.log('warming up', uri,data);
        return {
            uri,
            data:data,
            size:data.length
        };
    },
    cleanup: async (request, {uri}) => {
        if(request.exception){
            return;
        }
        return {
            size: 0, 
            uri
        };
    }
});


