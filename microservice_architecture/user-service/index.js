const express = require('express');
const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

let users = [
    {
        id: 1,
        name: "Rajshekhar",
        email: "rajsheakharmishra001@gmail.com"
    },
    {
        id:2,
        name: "Deepanshu Chourase",
        email: "deepanshu@example.com"
    }
];

app.get('/', (req, res) => res.send('User Service Root OK'));
app.get('/users' , (req,res)=> res.json(users));

app.post('/users', (req,res)=>{
    const newUser = {
        id: Date.now(), ...req.body
    };
    users.push(newUser);
    res.status(201).json(newUser);
});

app.listen(PORT , ()=>{
    console.log(`User service running on port ${PORT}`);
})