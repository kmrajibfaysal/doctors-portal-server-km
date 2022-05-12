/* eslint-disable no-multi-spaces */
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');

const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());
// Get requests
app.get('/', (req, res) => {
    res.send(`Doctors portal server running on port ${port}`);
});

// Database connection

// eslint-disable-next-line prettier/prettier
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.fakac.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverApi: ServerApiVersion.v1,
});

const run = async () => {
    try {
        await client.connect();
        console.log('Database connected');
        const serviceCollection = client.db('doctors-portal').collection('services');
        app.get('/service', async (req, res) => {
            const query = {};
            const cursor = serviceCollection.find(query);
            const services = await cursor.toArray();
            res.send(services);
        });
    } finally {
        //
    }
};

run().catch(console.dir);

// Listener
app.listen(port, () => {
    console.log(`Doctors portal server running on port ${port}`);
});
