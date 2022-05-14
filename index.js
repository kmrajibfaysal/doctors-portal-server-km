/* eslint-disable no-param-reassign */
/* eslint-disable object-shorthand */
/* eslint-disable no-unused-vars */
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
        const bookingsCollection = client.db('doctors-portal').collection('bookings');
        const userCollection = client.db('doctors-portal').collection('users');

        // service api
        app.get('/service', async (req, res) => {
            const query = {};
            const cursor = serviceCollection.find(query);
            const services = await cursor.toArray();
            res.send(services);
        });

        // record user
        app.put('/user/:email', async (res, req) => {
            const { email } = req.params;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updatedDoc = {
                $set: user,
            };

            const result = await userCollection.updateOne(filter, updatedDoc, options);
            res.send(result);
        });

        // available slot api
        app.get('/available', async (req, res) => {
            const date = req.query.date || 'May 14, 2022';

            // get all services
            const services = await serviceCollection.find().toArray();

            // get booking of that date
            const query = { date: date };
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
        app.get('/booking', async (req, res) => {
            const { patient } = req.query;
            const query = { patient: patient };
            const bookings = await bookingsCollection.find(query).toArray();
            res.send(bookings);
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
