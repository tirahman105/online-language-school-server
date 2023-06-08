const express = require('express')
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express()
require('dotenv').config()
const port = process.env.PORT || 5000




// middleware
app.use(cors());
app.use(express.json());





const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.kx4dtgt.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const usersCollection = client.db("schoolDB").collection("users");
    const allClasses = client.db("schoolDB").collection("classes");
    const bookedClasses = client.db("schoolDB").collection("booked");


       // users related apis

       app.get('/users', async(req, res) => {
        const result = await usersCollection.find().toArray();
        res.send(result);
      })


       app.post('/users', async (req, res) => {
        const user = req.body;
        console.log(user);
        const query = { email: user.email }
        const existingUser = await usersCollection.findOne(query);
          console.log('existing user' , existingUser)
        if (existingUser) {
          return res.send({ message: 'user already exists' })
        }
  

        const result = await usersCollection.insertOne(user);
        res.send(result);
      })


      app.patch('/users/admin/:id', async (req, res) => {
        const id = req.params.id;
        console.log(id);
        const filter = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: {
            role: 'admin'
          },
        };
  
        const result = await usersCollection.updateOne(filter, updateDoc);
        res.send(result);
  
      })



      app.patch('/users/instructor/:id', async (req, res) => {
        const id = req.params.id;
        console.log(id);
        const filter = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: {
            role: 'instructor'
          },
        };
  
        const result = await usersCollection.updateOne(filter, updateDoc);
        res.send(result);
  
      })


     // classes related apis
     app.get('/classes', async(req, res) => {
        const result = await allClasses.find().toArray();
        res.send(result);
    })



      // booked classes apis

         
      app.get('/booked', async (req, res) => {
        const email = req.query.email;
 
        if (!email) {
          res.send([]);
        }
        const query = { email: email };
        const result = await bookedClasses.find(query).toArray();
        res.send(result);
      });


      app.post('/booked', async (req, res) => {
        const item = req.body;
        console.log(item);
        const result = await bookedClasses.insertOne(item);
        res.send(result);
      })

      app.delete('/booked/:id', async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await bookedClasses.deleteOne(query);
        res.send(result);
      })



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
  res.send('School server is running!')
})


app.listen(port, () => {
  console.log(`app listening on port ${port}`)
})
