const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser =  require('cookie-parser');
require('dotenv').config();
const { MongoClient, ServerApiVersion,ObjectId} = require('mongodb');
const app =express();
const port = process.env.PORT || 5000;


app.use(cors({
  origin: ['http://localhost:5173'],
  credentials: true
}))
app.use(express.json())
app.use(cookieParser())

console.log(process.env.DB_PASS);

// const uri = "mongodb+srv://<username>:<password>@cluster0.yctm60s.mongodb.net/?retryWrites=true&w=majority";

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.yctm60s.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});


const verifyToken = (req, res, next) => {
  const token = req?.cookies?.token
  if (!token) {
    return res.status(401).send({ message: "Invalid user" })
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "Invalid user err" })
    }
    req.user = decoded;
    next()
  })

}




async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const roomsCollection = client.db('peninsula').collection('rooms')
    const mybookingCollection = client.db('peninsula').collection('mybooking')

    // Jwt api

    app.post('/jwt', async (req, res) => {
      const user = req.body;
      console.log(user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
      res
        .cookie('token', token, {
          httpOnly: true,
          secure: false,
          // sameSite: 'none'
        })
        .send({ success: true });
    });
    
    app.post('/logout', async (req, res) => {
      const user = req.body
      console.log(user);
      
      res.clearCookie("token", { maxAge: 0 }).send({ success: true });
    })


    // Fetching all rooms

    app.get('/rooms', async(req, res) => {
        const cursor =  roomsCollection.find();
        const result = await cursor.toArray();
        res.send(result)
    })


    // Fetching single details by id from room collection
     app.get('/rooms/:id', async (req, res) => {
      const id = req.params.id;
      
      const query = { _id: new ObjectId(id) };
      const result = await roomsCollection.findOne(query);
        // console.log(result);
        res.send(result);
    });


// trying to update availability
    
    app.patch('/rooms/:id', async (req, res) => {
      const id = req.params.id;
      
      const filter = { _id: new ObjectId(id) };
      const options = {upsert: true}
      const {availability} = req.body;
      

      const updatedRooms = {
        $set: {
          availability: availability === "available" ? "unavailable" : "available" 
        }
      }

      const result = await roomsCollection.updateOne(filter, updatedRooms ,options)
      
      res.send({result})
      
      
    });


// Posting data that user selects
    app.post('/mybooking', async(req, res) => {
      const newBook = req.body;
      console.log(newBook);
      const result =  await mybookingCollection.insertOne(newBook);
      res.send(result)
    })


// Finding booking by email
    app.get('/mybooking', verifyToken, async (req, res) => {

      console.log('tokka kaote', req.cookies.token)

      if (req.user.email !== req.query.email) {
        return res.status(403).send({ message: "forbidden" })
      }
     
      let query = {};
      if(req?.query?.email){
        query = {email : req.query.email}
      }
      const result = await mybookingCollection.find(query).toArray();
      console.log(result);
      res.send(result);
    });

// Delting booking

    app.delete('/deletebooking/:id', async(req, res) => {
      const id = req.params.id;
      const query = {_id : new ObjectId(id)}
      const result = await mybookingCollection.deleteOne(query);
      console.log(result);
      res.send(result)
    })



// Height to lowest

app.get('/hightolow', async(req, res) => {
  const cursor =  roomsCollection.find().sort({price_per_night: -1});
  const result = await cursor.toArray();
  res.send(result)
})

// low to high

app.get('/lowtohigh', async(req, res) => {
  const cursor =  roomsCollection.find().sort({price_per_night: 1});
  const result = await cursor.toArray();
  res.send(result)
})

app.get("/update/:id",async(req,res) => {
  const id= req.params.id
  const query ={_id : new ObjectId(id)};
  const result = await mybookingCollection.findOne(query)
  res.send(result);

});


app.put("/update/:id",async(req,res) => {
  const id = req.params.id
  const filter = {_id: new ObjectId(id)}
  const options = { upsert: true };
  const data = req.body
  console.log(data);
  const updateDoc = {
    $set:{
      date : data.newDate
    }
  }
  const result = await mybookingCollection.updateOne(filter,updateDoc,options)
  res.send(result);
});

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Hotel is on')
})

app.listen(port, () => {
    console.log(`Servrer inrunnig on ${port}`);
})