const express = require('express');
const app = express();
const PORT = process.env.PORT || 5002;

app.use(express.json());

let products = [
    {
        id: 1 , name: 'Laptop', price: 50000
    },
    {
        id: 2 , name: 'headphones', price: 2000
    }
];
app.get('/', (req, res) => res.send('Product Service Root OK'));

app.get('/products' , (req,res)=>
    res.json(products));

app.post('/products', (req,res)=>{
    const newProduct = {
        id: Date.now(),...req.body
    };
    products.push(newProduct);
    res.status(201).json(newProduct);
});

app.listen(PORT , ()=>{
    console.log(`product services running on port ${PORT}`)
})