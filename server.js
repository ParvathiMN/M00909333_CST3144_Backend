// Importing required modules
const express = require('express');
const { result } = require('lodash');
const MongoClient = require('mongodb').MongoClient;
const cors = require('cors');
var path = require("path"); 
var fs = require("fs"); 


const app = express();

// Middleware to parse JSON request bodies
app.use(express.json());
app.set('port', 3000);
app.use (cors())

// Middleware for enabling Cross-Origin Resource Sharing (CORS)
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT");
    res.setHeader("Access-Control-Allow-Headers", "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers");
    next();
}); 

let db;

// MongoDB connection
const connectionURI = 'mongodb+srv://parvathim2004:1234@cluster0.acnmseg.mongodb.net/';
const client = new MongoClient(connectionURI);
async function connectToDB() {
    try {
        await client.connect();
        console.log('Connected to MongoDB');
        // Select the database
        db = client.db('CST3144_M00909333');
        console.log('Database selected:', 'CST3144_M00909333');
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
    }
}

// Ensure connection before starting the server
connectToDB().then(() => {
    // Middleware to identify collection names in the route
    app.param('collectionName', (req, res, next, collectionName) => {
        try {
            if (!db) throw new Error("Database connection not established");
            const collection = db.collection(collectionName);
            if (!collection) throw new Error(`Collection ${collectionName} not found`);
            req.collection = collection;
            next();
        } catch (error) {
            next(error); // Pass error to the error-handling middleware
        }
    });

    // Retrieve all documents from a specified collection
    app.get('/collection/:collectionName', (req, res, next) => {
        req.collection.find({}).toArray((err, results) => {
            if (err) return next(err);
            res.json(results);
        });
    });

    // Retrieve all documents from Lesson
        app.get('/collection/Lesson', (req, res, next) => {
            req.collection.find({}).toArray((err, results) => {
                if (err) return next(err);
                res.json(results);
            });
        });
    
    // Search for lessons by subject or location using query parameters
    app.get("/search", function (req, res) {
        const searchQuery = req.query.q; // Get the search query from the URL

        if (!searchQuery) {
            return res.status(400).send("Search query parameter 'q' is required.");
        }

        // Create a case-insensitive regex to match the search query
        const searchRegex = new RegExp(searchQuery, 'i');

        db.collection('Lesson').find({
            $or: [
                { subject: { $regex: searchRegex } },
                { Location: { $regex: searchRegex } }
            ]
        }).toArray((err, results) => {
            if (err) {
                return res.status(500).send("Error occurred while searching.");
            }

            // If there are results, send them as a JSON response
            if (results.length > 0) {
                res.json(results);
            } else {
                // If no matches found, send a message
                res.send("No lessons found matching the search criteria.");
            }
        });
    });

    // Add a new document to a specified collection
    app.post('/collection/:collectionName', (req, res, next) => { 
        req.collection.insert(req.body, (e, results) => { 
            if (e) return next(e); 
            res.send(results.ops); // Return the inserted document
        }); 
    });

    // Retrieve all documents from the "Orders" collection
    app.get('/collection/Orders', (req, res, next) => {
        req.collection.find({}).toArray((error, results) => {
            if (error) return next(error);
            res.json(results); 
        });
    });

    // Add a new order to the "Orders" collection with validation
    app.post('/collection/Orders', async (req, res) => {
        try {
            const orderDetails = req.body;
    
            // Validate required fields
            if (!orderDetails.customer || !orderDetails.cart || orderDetails.cart.length === 0 || !orderDetails.total) {
                return res.status(400).json({ message: 'Invalid order details' });
            }
    
            // Insert order into database
            const result = await db.collection('Orders').insertOne(orderDetails);
    
            // Decrease availability of slots dynamically
            for (const item of orderDetails.cart) {
                await db.collection('Lesson').updateOne(
                    { _id: item._id },
                    { $inc: { availableslots: -item.quantity } }
                );
            }
    
            res.status(201).json({
                message: 'Order placed successfully',
                order: result.ops[0],
            });
        } catch (error) {
            res.status(500).json({ message: 'Failed to place order', error: error.message });
        }
    });
    

    // Retrieve a document by ID from a specified collection
    const ObjectID = require('mongodb').ObjectID; 
    app.get('/collection/:collectionName/:id', (req, res, next) => { 
        req.collection.findOne({ _id: new ObjectID(req.params.id) }, (e, result) => { 
            if (e) return next(e); 
            res.send(result); 
        }); 
    });

    // Update a document by ID in a specified collection
    app.put('/collection/:collectionName/:id', (req, res, next) => { 
        req.collection.update(
            { _id: new ObjectID(req.params.id) }, 
            { $set: req.body }, // Update fields provided in the request body
            { safe: true, multi: false },  
            (e, result) => { 
                if (e) return next(e); 
                res.send((result.result.n === 1) ? { msg: 'success' } : { msg: 'error' }); 
            }
        ); 
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
    app.listen( 3000 , "0.0.0.0", () =>  console.log('Server is running on port 3000 '));
});