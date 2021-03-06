var argv = require('yargs')
.usage('Usage: $0 -a [string]')
.argv;
const util= require('util');
var fs = require('fs');
const readFilePromise = util.promisify(fs.readFile);
const writeFilePromise = util.promisify(fs.writeFile);
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const readline = require('readline');
var http = require('http');
var request = require('request');
var path = require('path');
let address;
const getPromise = util.promisify(http.get);
const getAllFilesPromise = util.promisify(getAllFiles);
const axios = require('axios');
const Papa = require('papaparse');
const csv = require('fast-csv');


async function run(){
    if(argv.a){
        var string = argv.a;
        fs.readFile(string, 'utf8', function(err, file) {
                    if (err) throw err;
                    address = file.split(";");
                    console.log("All IPs are fetched");
                    });
    }else{
        var api_url = 'http://api.watcharaphat.com/ip/list';
        var response = await axios.get(api_url);
        var i=0;
        while(response.data.ip[i]){
            response.data.ip[i] = response.data.ip[i] +";8000";
            i++;
        }
        address = response.data.ip;
        console.log("All IPs are fetched");
        
    }
    await getAllFiles(address); // download all files from webservers of specified IP address
    calculation(address);
}


async function writeFile(data, filename) {
    try{
        await writeFilePromise(filename, data);
        console.log("Remote result files are saved!");
    }catch(err){
        console.log(err);
    }
}


async function downloadFile(address, filename) {
    // Get the data from url
    var data = "";
    var url = "http://"+address+":8100/"+filename;

    var response = await axios.get(url);
    var data = response.data;
    
    var name = "results/"+address.split('.').join("_")+".csv" ;
    await writeFile(data,name); // write the datas in a file
    
}


async function getAllFiles(address) {
    var index = 0;
    console.log("Start downloading the remote result files");
    while(address[index]!=null){
        var destination = address[index].split(";");
        await downloadFile(destination[0],'result.csv' );
        index +=2;
    }
}

async function calculation(address){
    console.log("Start calculations");
    var index = 0;
    //Get logs from loadtest.js
    var loadTestData = await readFilePromise("results/transactionList.csv",'utf8')
    var loadTestParsed = Papa.parse(loadTestData).data;

    
    // Get each result file from TM nodes
    while(address[index]!=null){
        var destinationPair = address[index].split(";");
        
        var filePath = "results/" + destinationPair[0] + ".csv" ;
        var fileData = await readFilePromise(filePath,'utf8');
        var fileParsed = Papa.parse(fileData).data;
        // compare the two files
        var sumPropagationTime = 0;
        
        var sumPropagationTime128 = 0;
        var sumPropagationTime512 = 0;
        var sumPropagationTime1024 = 0;

        var iterration128 = 0;
        var iterration512 = 0;
        var iterration1024 = 0;
        var iterration = 0;

        for(var i in loadTestParsed)
        {
            for(var j in fileParsed)
            {
                if(loadTestParsed[i] && fileParsed[j] && loadTestParsed[i][1] == fileParsed[j][1])
                {
                    
                    if(loadTestParsed[i][4]==128){
                        var propagationTime128 = fileParsed[j][0] - loadTestParsed[i][0];
                        sumPropagationTime128 += propagationTime128;
                        iterration128 ++;
                    }
                    else if(loadTestParsed[i][4]==512){
                        var propagationTime512 = fileParsed[j][0] - loadTestParsed[i][0];
                        sumPropagationTime512 += propagationTime512;
                        iterration512 ++;
                    }
                    if(loadTestParsed[i][4]==1024){
                        var propagationTime1024 = fileParsed[j][0] - loadTestParsed[i][0];
                        sumPropagationTime1024 += propagationTime1024;
                        iterration1024 ++;
                    }
                    
                    var propagationTime = fileParsed[j][0] - loadTestParsed[i][0];
                    sumPropagationTime += propagationTime ;
                    iterration ++;
                    
                }
            }
        }
        
        var avgPropagationTime = sumPropagationTime / iterration;
        
        console.log("Average propagation time of node  " +destinationPair[0] + " = " + avgPropagationTime )
        console.log("Average propagation time of 128bits paquets of node  " +destinationPair[0] + " = " + (sumPropagationTime128/iterration128) )
        console.log("Average propagation time of 512bits paquets of node  " +destinationPair[0] + " = " + (sumPropagationTime512/iterration512) )
        console.log("Average propagation time of 1024bits paquets of node  " +destinationPair[0] + " = " +(sumPropagationTime1024/iterration1024) )
        
        index +=1 ;
    }
}

async function main(){
     run();
 
}

main();
