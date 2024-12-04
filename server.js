// Importing required modules
const express = require('express');
const { result } = require('lodash');
const MongoClient = require('mongodb').MongoClient;
var path = require("path"); 
var fs = require("fs"); 

const app = express();
const port = process.env.PORT || 3000;

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

// MongoDB connection using async/await
async function connectToDB() {
    try {
        const client = await MongoClient.connect('mongodb+srv://parvathim2004:1234@cluster0.acnmseg.mongodb.net/', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        db = client.db('CST3144_M00909333');
        console.log('Connected to MongoDB');
    } catch (err) {
        console.error('Failed to connect to MongoDB', err);
    }
}

// Ensure connection before starting the server
connectToDB().then(() => {
    // Root route to show a basic response
    app.get('/', (req, res, next) => {
        res.send('Select a collection, e.g., /messages');
    });

    // Middleware to identify collection names in the route
    app.param('collectionName', (req, res, next, collectionName) => { 
        req.collection = db.collection(collectionName); 
        return next(); 
    });

    // Retrieve all documents from a specified collection
    app.get('/:collectionName', (req, res, next) => { 
        req.collection.find({}).toArray((e, results) => { 
            if (e) return next(e); 
            res.send(results); 
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
    app.post('/:collectionName', (req, res, next) => { 
        req.collection.insert(req.body, (e, results) => { 
            if (e) return next(e); 
            res.send(results.ops); // Return the inserted document
        }); 
    });

    // Retrieve all documents from the "Orders" collection
    app.get('/Orders', (req, res, next) => {
        req.collection.find({}).toArray((error, results) => {
            if (error) return next(error);
            res.json(results); 
        });
    });

    // Add a new order to the "Orders" collection with validation
    app.post('/orders', async (req, res) => {
        try {
            const orderDetails = req.body;

            // Validate required fields in the order
            if (!orderDetails.customer || !orderDetails.items || !orderDetails.totalPrice) {
                return res.status(400).json({ message: 'Missing required order fields' });
            }

            // Insert the order into the 'Orders' collection
            const result = await db.collection('Orders').insertOne(orderDetails);

            // Respond with success
            res.status(201).json({
                message: 'Order placed successfully',
                order: result.ops[0] // Return the inserted order
            });
        } catch (err) {
            // Handle errors
            console.error('Order insertion failed:', err);
            res.status(500).json({ message: 'Failed to create order', error: err.message });
        }
    });

    // Retrieve a document by ID from a specified collection
    const ObjectID = require('mongodb').ObjectID; 
    app.get('/:collectionName/:id', (req, res, next) => { 
        req.collection.findOne({ _id: new ObjectID(req.params.id) }, (e, result) => { 
            if (e) return next(e); 
            res.send(result); 
        }); 
    });

    // Update a document by ID in a specified collection
    app.put('/:collectionName/:id', (req, res, next) => { 
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
    
    app.listen(port, () => {
        console.log('Server is running on port ${port}');
    });
});