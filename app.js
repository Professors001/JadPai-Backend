// app.js
const express = require('express');
const bodyParser = require('body-parser');
const { connectMySQL } = require('./database');

const userRoutes = require('./routes/userRoutes');
const enrollmentRoutes = require('./routes/enrollmentRoutes');
const eventRoutes = require('./routes/eventRoutes');

const app = express();
const port = 6969;

app.use(bodyParser.text());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/users', userRoutes);
app.use('/enrollments', enrollmentRoutes);
app.use('/events', eventRoutes);

app.get('/', (req, res) => {
    res.send('Hello This is NodeJS Server with Nodemon with Seperated File');
});

app.get('/book', (req, res) => {
    let book = {
        name: 'The Story of My C',
        pages: 12
    };
    res.json(book);
});

const startServer = async () => {
    await connectMySQL();
    app.listen(port, () => {
        console.log(`Server Running at Port ${port}`);
    });
};

startServer();