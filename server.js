const express = require('express');
const { result } = require('lodash');
const MongoClient = require('mongodb').MongoClient;
var path = require("path"); 
var fs = require("fs"); 


const app = express();

app.use(express.json());
app.set('port', 3000);
app.use((req,res,next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT");
    res.setHeader("Access-Control-Allow-Headers", "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers");

    next();
})


let db;

MongoClient.connect('mongodb+srv://parvathim2004:1234@cluster0.acnmseg.mongodb.net/', (err, client)=>{
    db = client.db('CST3144_M00909333');
});

app.get('/',(req,res,next)=>{
    res.send('Select a collection, e.g., /collection/messages');
});

app.param('collectionName', (req, res, next, collectionName) => { 
     req.collection = db.collection(collectionName) 
     return next() 
 });


 app.get('/collection/:collectionName', (req, res, next) => { 
    req.collection.find({}).toArray((e, results) => { 
    if (e) return next(e) 
        res.send(results) 
        }) 
    })  

    app.post('/collection/:collectionName', (req, res, next) => { 
        req.collection.insert(req.body, (e, results) => { 
        if (e) return next(e) 
        res.send(results.ops)
         }) 
        }) 
        
      const ObjectID = require('mongodb').ObjectID; 
app.get('/collection/:collectionName/:id', (req, res, next) => { 
req.collection.findOne({ _id: new ObjectID(req.params.id) }, (e, result) => { 
if (e) return next(e) 
res.send(result) 
}) 
}) 

app.put('/collection/:collectionName/:id', (req, res, next) => { 
    req.collection.update( 
    {_id: new ObjectID(req.params.id)}, 
    {$set: req.body}, 
    {safe: true, multi: false},  
    (e, result) => { 
    if (e) return next(e) 
    res.send((result.result.n === 1) ? {msg: 'success'} : {msg: 'error'}) 
    }) 
    })



app.use(function(req, res, next) { 
    // Uses path.join to find the path where the file should be 
    var filePath = path.join(__dirname, "image", req.url); 
    // Built-in fs.stat gets info about a file 
    fs.stat(filePath, function(err, fileInfo) { 
    if (err) { 
    next(); 
    return; 
    } 
    if (fileInfo.isFile()) res.sendFile(filePath); 
    else next(); 
    }); 
    }); 

    // There is no 'next' argument because this is the last middleware. 
    app.use(function(req, res) { 
    // Sets the status code to 404 
    res.status(404); 
    res.send("File not found!"); 
    }); 


const port =process.env.PORT ||3000
app.listen(port)

// app.listen(3000,()=>{
//     console.log('server.js server running at localhost:3000')
// })