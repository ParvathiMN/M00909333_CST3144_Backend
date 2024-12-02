// Importing required modules
const express = require('express');
const MongoClient = require('mongodb').MongoClient;
const path = require("path");
const fs = require("fs");
const { ObjectID } = require('mongodb');

const app = express();
const port = process.env.PORT || 3000;

let db; // Database reference

// Middleware to parse JSON request bodies
app.use(express.json());

// Middleware for enabling Cross-Origin Resource Sharing (CORS)
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT");
    res.setHeader("Access-Control-Allow-Headers", "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers");
    next();
});

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
        process.exit(1); // Exit if unable to connect to database
    }
}

// Middleware to ensure database connection is established
app.use((req, res, next) => {
    if (!db) {
        return res.status(500).send('Database not initialized. Please try again later.');
    }
    next();
});

// Middleware to identify collection names in the route
app.param('collectionName', (req, res, next, collectionName) => {
    try {
        req.collection = db.collection(collectionName); // Ensure db is initialized
        return next();
    } catch (err) {
        next(new Error('Collection not found or database connection issue.'));
    }
});

// Root route to show a basic response
app.get('/', (req, res) => {
    res.send('Select a collection, e.g., /collection/messages');
});

// Retrieve all documents from a specified collection
app.get('/collection/:collectionName', (req, res, next) => {
    req.collection.find({}).toArray((e, results) => {
        if (e) return next(e);
        res.send(results);
    });
});

// Search for lessons by subject or location using query parameters
app.get("/search", (req, res) => {
    const searchQuery = req.query.q;

    if (!searchQuery) {
        return res.status(400).send("Search query parameter 'q' is required.");
    }

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
        if (results.length > 0) {
            res.json(results);
        } else {
            res.send("No lessons found matching the search criteria.");
        }
    });
});

// Add a new document to a specified collection
app.post('/collection/:collectionName', (req, res, next) => {
    req.collection.insert(req.body, (e, results) => {
        if (e) return next(e);
        res.send(results.ops);
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
app.post('/collection/orders', async (req, res) => {
    try {
        const orderDetails = req.body;

        if (!orderDetails.customer || !orderDetails.items || !orderDetails.totalPrice) {
            return res.status(400).json({ message: 'Missing required order fields' });
        }

        const result = await db.collection('Orders').insertOne(orderDetails);

        res.status(201).json({
            message: 'Order placed successfully',
            order: result.ops[0]
        });
    } catch (err) {
        console.error('Order insertion failed:', err);
        res.status(500).json({ message: 'Failed to create order', error: err.message });
    }
});

// Retrieve a document by ID from a specified collection
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
        { $set: req.body },
        { safe: true, multi: false },
        (e, result) => {
            if (e) return next(e);
            res.send((result.result.n === 1) ? { msg: 'success' } : { msg: 'error' });
        }
    );
});

// Serve static files from the "image" directory
app.use((req, res, next) => {
    const filePath = path.join(__dirname, "image", req.url);
    fs.stat(filePath, (err, fileInfo) => {
        if (err) {
            next();
            return;
        }
        if (fileInfo.isFile()) res.sendFile(filePath);
        else next();
    });
});

// Handle 404 errors for undefined routes
app.use((req, res) => {
    res.status(404).send("File not found!");
});

// Start the server only after MongoDB connection is successful
connectToDB().then(() => {
    app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    });
}).catch(err => {
    console.error('Failed to connect to MongoDB on startup:', err);
});
