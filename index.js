
/**
 * Created by karan on 1/03/2018.
 * Assumes at max 1 assignment per class, else need to update function getAssignment().
 */
//'use strict';

var testhelpers = require('./testhelpers');
var colors = require('colors');
var productConfig = require('./config/products');
var userConfig = require('./config/users');

var gbl_product_service_url, gbl_auth_service_url;

if(process.env.Environment.startsWith("Production")){
    gbl_product_service_url = "http://product.comprodls.com/";
    gbl_auth_service_url = "http://auth.comprodls.com/";
}else{
    gbl_product_service_url = "http://product-staging1.comprodls.com/";
    gbl_auth_service_url = "http://auth-staging1.comprodls.com/";
}

let filePath = __dirname+'/output.txt';
let output = {};

let consumerOrg1 = process.env.ConsumerOrg1;
let consumerOrg2 = process.env.ConsumerOrg2;
let publisherOrg1 = process.env.PublisherOrg1;

output.consumer = [];
output.consumer.push({
    name: consumerOrg1,"users": userConfig});
output.consumer.push({
    name: consumerOrg2,
    users: {
        admins: [
            {
                 username: process.env.Admin_Username_consumerOrg2 ,
                 password: process.env.Admin_Password_consumerOrg2
            }
        ]}
    });
output.publisher = [];
output.publisher.push({
    name: publisherOrg1,
    users: {
        admins: [
            {
                username: process.env.Admin_Username_publisherOrg1,
                password: process.env.Admin_Password_publisherOrg1
            }
        ]}
});

var token;

let config_data = {
    products: {
        orgid: consumerOrg1,
        product: productConfig
    },
    sis_import_users: {
        orgid: consumerOrg1,
        csv: "./config/sis_import_users.csv"
    }
};

function authenticate(org,username,password,callback){
	console.log(gbl_auth_service_url);
    testhelpers.post(gbl_auth_service_url + 'auth/' + org + '/token',
        {"username": username,   "password": password},
        {"Accept": 'application/json'},
        function(err , res) {
            if (err) {
                console.log(err);
                console.log("Error while user authenication".red);
                console.log((" For username: " + username).red);
            }
            else {
                token = res.body.access_token;
                console.log(("Successfully authenticated user with username: " + username).green);
            }
            if(callback){
                callback();
            }
    });
}

function updateOrgSettings(org,callback){
    testhelpers.put(gbl_auth_service_url + 'org/' + org + '/settings',
        {"lti": {
            "auto_entitle_classproducts": false,
            "enable": true,
            "user_enrollments": 500
        },
            "product": {
                "promote": "enabled",
                "archive": "enabled",
                "ingestion": "enabled"
            },
            "sis": {
                "productid": [],
                "product_entitlement": false
            }},
        { "Authorization" : token},
        function(err , res) {
            if (err) {
                console.log(err);
                console.log("Error while updating settings of org".red);
            }
            else {
                console.log(("Successfully updating settings of org ").green);
            }
            if(callback){
                callback();
            }
        });
}

function setupUsers(callback){
    var org = config_data.sis_import_users.orgid;
    testhelpers.uploadFile(gbl_auth_service_url + 'org/' + org + '/sis_imports',
        {
            "import_type": "users",
            "extension": "csv"
        } ,
        config_data.sis_import_users.csv,
        {
            "Authorization" : token
        },
        function (err , res) {
            if (err) {
                console.log(err);
                console.log(("Error while sis import of users csv ").red);
            } else {
                config_data.sis_import_users.sis_import_jobid = res.body.uuid;
                console.log(("Successfully imported user with jobid " + res.body.uuid ).green);
                if(callback){
                    callback();
                }
            }
     });

}

function registerProducts(callback){
    var productObj = config_data.products;
    var productsArr = productObj.product;
    var org = productObj.orgid;
    var result = {};
    var registerProductLoop = function(counter, registerProductCallback){
        try{
            var product = productsArr[counter];			
            var product_type = product["type"];
            var body = {
                "producttitle": product["title"],
                "producttype": product["type"],
                "productcode" : product["code"]
            };
            if(product.hasOwnProperty("github")){
                body.repositorytype = product["github"];
                body.github = {};
                body.github.repository = product["gitURL"];
                body.github.token = product["gitToken"]
            }
            if(product.hasOwnProperty("s3")){
                body.repositorytype = product["s3"];
                body.s3 = {};
                body.s3.bucket = product["bucket"];
                body.s3.accessKeyId = product["accessKeyId"];
                body.s3.secretAccessKey = product["secretAccessKey"];
            }
        }catch(err){
            console.log((err.message).red);
        }
        testhelpers.post(gbl_product_service_url + org +'/products/register' ,
            body ,
            {"Authorization" : token},
            function (err , res ) {
                if (err) {
                    if(product["gitToken"]==""){
                        if(!result.hasOwnProperty(product_type))
                            result[product_type] = [];
                        result[product_type].push({
                            id: res.body.uuid,
                            repo: product["github"] ,
                            title: product["title"],
                            branchref: product["code"],
                            gitURL: product["gitURL"]
                        });
                    }else{
                        console.log(err);
                        console.log(("Error while registering product with title" + product["title"]).red);
                    }
                } else {
                    try{
                        if(!result.hasOwnProperty(product_type))
                            result[product_type] = [];
                        result[product_type].push({
                            id: res.body.uuid,
                            repo: product["github"] ,
                            title: product["title"],
                            branchref: product["code"],
                            gitURL: product["gitURL"]
                        });
                        config_data.products.product[counter].id = res.body.uuid;
                        console.log(("Successfully registered product with product title: "+res.body.registrationtitle).green);
                    }catch(err){
                        console.log((err.message).red);
                    }
                }

                if(++counter < productsArr.length){
                    registerProductLoop(counter ,registerProductCallback);
                }
                else {
                    registerProductCallback();
                }
            });
    };

    registerProductLoop(0 , function(){
        for(var i=0;i<output.consumer.length;i++){
            if(output.consumer[i].name == org)
                output.consumer[i].products = result;
        }
        callback();
    });
}

function ingestProducts(callback){
    var productsArr = config_data.products.product;
    var org = config_data.products.orgid;
    var ingestProductLoop = function(counter, ingestProductLoopCallback){
        var product = productsArr[counter];
        var product_id = product["id"];
        var branchref = product["code"];

            testhelpers.post(gbl_product_service_url + org + '/products/' + product_id + '/ingest',
                {
                    "branchref": branchref
                },
                {"Authorization": token},
                function (err, res) {
                    if (err) {
                        if(product["gitToken"]==""){}
                        else{
                            console.log(err);
                            console.log(("Error while ingesting product with id " + product_id + " in branch: " + branchref).red);
                        }
                    } else {
                        try{
                            console.log(("Successfully ingested product with id " + product_id + " in branch: " + branchref).green);
                        }catch(err){
                            console.log((err.message).red);
                        }
                    }
                    if(++counter < productsArr.length){
                        ingestProductLoop(counter ,ingestProductLoopCallback);
                    }
                    else {
                        ingestProductLoopCallback();
                    }
                });
    };

    ingestProductLoop( 0 , function(){
        callback();
    });

}

function writeDataToJSONFile(jsonFilePath){
    var fs = require('fs');
    fs.writeFile(jsonFilePath , JSON.stringify(output) , null, "\t");
}

authenticate(consumerOrg1,process.env.Admin_Username_consumerOrg1,process.env.Admin_Password_consumerOrg1,function(){
    updateOrgSettings(consumerOrg1,function(){
        registerProducts(function(){
            ingestProducts(function(){
                setupUsers(function(){
                    console.log("*********** Final output *************");
                    console.log(JSON.stringify(output));
                    console.log("************************");
                    writeDataToJSONFile(filePath);
                });
            });
        });
    });
});


