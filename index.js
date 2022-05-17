/* eslint-disable consistent-return */
/* eslint-disable no-param-reassign */
/* eslint-disable no-unused-vars */
/* eslint-disable no-multi-spaces */
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
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
// verify token

const verifyJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'UnAuthorized access!' });
    }

    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) return res.status(403).send({ message: 'Forbidden Access!' });
        req.decoded = decoded;
        next();
    });
};

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
        const bookingsCollection = client.db('doctors-portal').collection('bookings');
        const userCollection = client.db('doctors-portal').collection('users');

        // service api
        app.get('/service', async (req, res) => {
            const query = {};
            const cursor = serviceCollection.find(query).project({ name: 1 });
            const services = await cursor.toArray();
            res.send(services);
        });

        // admin check
        app.get('/admin/:email', async (req, res) => {
            const { email } = req.params;
            const user = await userCollection.findOne({ email });
            const isAdmin = user.role === 'admin';
            res.send({ admin: isAdmin });
        });

        // admin role
        app.put('/user/admin/:email', verifyJWT, async (req, res) => {
            const { email } = req.params;
            const requester = req.decoded.email;
            const requesterAccount = await userCollection.findOne({ email: requester });
            if (requesterAccount.role === 'admin') {
                const filter = { email };

                const updateDoc = {
                    $set: { role: 'admin' },
                };
                const result = await userCollection.updateOne(filter, updateDoc);
                res.send(result);
            } else {
                res.status(403).send({ message: 'forbidden' });
            }
        });

        // record user
        app.put('/user/:email', async (req, res) => {
            const { email } = req.params;
            const user = req.body;
            const filter = { email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            };

            const result = await userCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email }, process.env.ACCESS_TOKEN_SECRET);
            res.send({ result, token });
        });

        // get all users
        app.get('/user', verifyJWT, async (req, res) => {
            const users = await userCollection.find().toArray();
            res.send(users);
        });

        // available slot api
        app.get('/available', async (req, res) => {
            const date = req.query.date || 'May 14, 2022';

            // get all services
            const services = await serviceCollection.find().toArray();

            // get booking of that date
            const query = { date };
            const bookings = await bookingsCollection.find(query).toArray();

            // filter bookings
            services.forEach((service) => {
                const serviceBookings = bookings.filter((b) => b.treatment === service.name);
                const booked = serviceBookings.map((s) => s.slot);
                const available = service.slots.filter((s) => !booked.includes(s));
                service.slots = available;
            });
            res.send(services);
        });
        // get particular
        app.get('/booking', verifyJWT, async (req, res) => {
            const { patient } = req.query;
            const decodedEmail = req.decoded.email;

            if (patient === decodedEmail) {
                const query = { patient };
                const bookings = await bookingsCollection.find(query).toArray();
                return res.send(bookings);
            }
            return res.status(403).send({ message: 'Forbidden access!' });
        });

        // booking api
        app.post('/booking', async (req, res) => {
            const booking = req.body;
            const query = {
                treatment: booking.treatment,
                date: booking.date,
                patient: booking.patient,
            };
            // checking booking already exist or not
            const exists = await bookingsCollection.findOne(query);
            if (exists) {
                return res.send({ success: false, booking: exists });
            }

            // adding booking
            const result = await bookingsCollection.insertOne(booking);
            return res.send({ success: true, result });
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
