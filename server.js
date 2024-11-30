// Importing required modules
const express = require('express');
const { result } = require('lodash');
const MongoClient = require('mongodb').MongoClient;
var path = require("path"); 
var fs = require("fs"); 

const app = express();

// Middleware to parse JSON request bodies
app.use(express.json());
app.set('port', 3000);

// Middleware for enabling Cross-Origin Resource Sharing (CORS)
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT");
    res.setHeader("Access-Control-Allow-Headers", "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers");
    next();
});

let db;

// Connecting to MongoDB Atlas
MongoClient.connect('mongodb+srv://parvathim2004:1234@cluster0.acnmseg.mongodb.net/', (err, client) => {
    db = client.db('CST3144_M00909333');
});

// Root route to show a basic response
app.get('/', (req, res, next) => {
    res.send('Select a collection, e.g., /collection/messages');
});

// Middleware to identify collection names in the route
app.param('collectionName', (req, res, next, collectionName) => { 
    req.collection = db.collection(collectionName); 
    return next(); 
});

// Retrieve all documents from a specified collection
app.get('/collection/:collectionName', (req, res, next) => { 
    req.collection.find({}).toArray((e, results) => { 
        if (e) return next(e); 
        res.send(results); 
    }); 
});

// Search for lessons by subject or location using query parameters
app.get('/collection/Lesson', (req, res, next) => {
    const searchQuery = req.query.q; 
    const searchRegex = new RegExp(searchQuery, 'i'); // Case-insensitive regex for search

    req.collection.find({
        $or: [
            { subject: searchRegex }, // Matches lessons with the query in the subject field
            { Location: searchRegex } // Matches lessons with the query in the Location field
        ]
    }).toArray((error, results) => {
        if (error) return next(error);
        res.json(results); 
    });
});

// Add a new document to a specified collection
app.post('/collection/:collectionName', (req, res, next) => { 
    req.collection.insert(req.body, (e, results) => { 
        if (e) return next(e); 
        res.send(results.ops); // Return the inserted document
    }); 
});

// Serve static files from the "image" directory
app.use(function(req, res, next) { 
    const filePath = path.join(__dirname, "image", req.url); 
    fs.stat(filePath, function(err, fileInfo) { 
        if (err) { 
            next(); 
            return; 
        } 
        if (fileInfo.isFile()) res.sendFile(filePath); 
        else next(); 
    }); 
});

// Handle 404 errors for undefined routes
app.use(function(req, res) { 
    res.status(404); // Set status to 404
    res.send("File not found!"); 
});

// Start the server
const port = process.env.PORT || 3000;
app.listen(port);

// app.listen(3000,()=>{
//     console.log('server.js server running at localhost:3000')
// })