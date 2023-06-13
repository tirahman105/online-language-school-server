const express = require('express')
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express()
require('dotenv').config()
const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY)
const port = process.env.PORT || 5000




// middleware
app.use(cors());
app.use(express.json());


const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ error: true, message: 'unauthorized access' });
  }
  console.log(authorization)
  // bearer token
  const token = authorization.split(' ')[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      console.log(err)
      return res.status(401).send({ error: true, message: 'unauthorized access' })
      
    }
    
    req.decoded = decoded;
    next();
  })
}





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
    const paymentCollection = client.db("schoolDB").collection("payments");




           // jwt
           app.post('/jwt', (req, res)=> {
            const user = req.body;
            console.log(user)
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '24h'});
            res.send({token})
          })


          const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email }
            const user = await usersCollection.findOne(query);
            if (user?.role !== 'admin') {
              return res.status(403).send({ error: true, message: 'forbidden message' });
            }
            next();
          }

          const verifyInstructor = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email }
            const user = await usersCollection.findOne(query);
            if (user?.role !== 'instructor') {
              return res.status(403).send({ error: true, message: 'forbidden message' });
            }
            next();
          }

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



         // check admin
    app.get('/users/admin/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        res.send({ admin: false })
      }

      const query = { email: email }
      const user = await usersCollection.findOne(query);
      const result = { admin: user?.role === 'admin' }
      res.send(result);
    })



    



          // check instructor
          app.get('/users/instructor/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
      
            if (req.decoded.email !== email) {
              res.send({ instructor: false })
            }
      
            const query = { email: email }
            const user = await usersCollection.findOne(query);
            const result = { instructor: user?.role === 'instructor' }
            res.send(result);
          })
      


// make admin api 

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



      app.patch('/classes/approve/:id', verifyJWT, verifyAdmin, async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: {
            approved: true
          },
        };
      
        const result = await allClasses.updateOne(filter, updateDoc);
        res.send(result);
      });
      



// make instructor api


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


    //  classes related apis
    app.get('/classes', async (req, res) => {
      let query = {};
      if(req.query?.email){
        query = {email: req.query.email}
      }

      const result = await allClasses.find(query).toArray();
      res.send(result);
    });
    


    app.post('/classes', verifyJWT, verifyInstructor, async (req, res) => {
      const newItem = req.body;
      const result = await allClasses.insertOne(newItem)
      res.send(result);
    })
    app.post('/classes/pending', verifyJWT, verifyInstructor, async (req, res) => {
      const newItem = req.body;
      const result = await allClasses.insertOne(newItem)
      res.send(result);
    })

    app.delete('/classes/:id', verifyJWT, verifyInstructor, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await allClasses.deleteOne(query);
      res.send(result);
    })



    app.patch('/classes/:id', async (req, res) => {
      const status= req.body.status;
      const feedback= req.body.feedback;
      
  console.log(status)
      const id = req.params.id;
      console.log(id);
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: status,
          feedback: feedback,
        },
      };

      const result = await allClasses.updateOne(filter, updateDoc);
      res.send(result);

    })


    app.put('/classes/:id', async(req, res) => {
      const id = req.params.id;
        const body = req.body;
        console.log(id, body);
       
        const filter = {_id: new ObjectId(id)}
        const options = {upsert: true}
        const updateDoc = {
              $set:body
            };
            const result = await allClasses.updateOne(filter, updateDoc, options);
            res.send(result);
  
  
    })


    // --------------------


    app.get('/classes/pending',  async (req, res) => {
      try {
        const pendingClasses = await allClasses.find().toArray();
        res.send(pendingClasses);
      } catch (error) {
        res.status(500).send({ error: true, message: 'Failed to fetch pending classes' });
      }
    });




    app.post('/classes/:id/approve', verifyJWT, verifyAdmin, async (req, res) => {
      const classId = req.params.id;
    
      try {
        const filter = { _id: new ObjectId(classId) };
        const update = { $set: { status: 'approved' } };
        const result = await allClasses.updateOne(filter, update);
    
        if (result.modifiedCount === 0) {
          return res.status(404).send({ error: true, message: 'Class not found' });
        }
    
        res.send({ message: 'Class approved successfully' });
      } catch (error) {
        res.status(500).send({ error: true, message: 'Failed to approve class' });
      }
    });

    
    app.post('/classes/:id/reject', verifyJWT, verifyAdmin, async (req, res) => {
      const classId = req.params.id;
    
      try {
        const filter = { _id: new ObjectId(classId) };
        const update = { $set: { status: 'rejected' } };
        const result = await allClasses.updateOne(filter, update);
    
        if (result.modifiedCount === 0) {
          return res.status(404).send({ error: true, message: 'Class not found' });
        }
    
        res.send({ message: 'Class rejected successfully' });
      } catch (error) {
        res.status(500).send({ error: true, message: 'Failed to reject class' });
      }
    });
    



      // booked classes apis

         
      app.get('/booked', verifyJWT, async (req, res) => {
        const email = req.query.email;
 
        if (!email) {
          res.send([]);
        }

        const decodedEmail = req.decoded.email;
        if (email !== decodedEmail) {
          return res.status(403).send({ error: true, message: 'forbidden access' })
        }
        const query = { user_email: email };
        const result = await bookedClasses.find(query).toArray();
        res.send(result);
      });
        
      
      app.get('/booked/instructor', verifyJWT, async (req, res) => {
        const email = req.query.email;
 
        if (!email) {
          res.send([]);
        }

        const decodedEmail = req.decoded.email;
        if (email !== decodedEmail) {
          return res.status(403).send({ error: true, message: 'forbidden access' })
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


       // create payment intent
    app.post('/create-payment-intent',  async (req, res) => {
      const { price } = req.body;
      const amount = parseFloat(price * 100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });

      res.send({
        clientSecret: paymentIntent.client_secret
      })
    })


    // payment related api
app.post('/payments', verifyJWT, async (req, res) => {
  const paymentInfo = req.body;
  paymentInfo.createdAt = new Date();
  const insertResult = await paymentCollection.insertOne(paymentInfo);

  const query = { _id: new ObjectId(paymentInfo._id) };
  const deleteResult = await bookedClasses.deleteOne(query);

  res.send({ insertResult, deleteResult });
});



app.get('/payments', async (req, res) => {
  let query = {};
  if(req.query?.email){
    query = {email: req.query.email}
  }
  

  const result = await paymentCollection.find(query).sort({ createdAt: -1 }).toArray();
  res.send(result);
});



app.get('/topInstructors', async (req, res) => {
  try {
    const result = await paymentCollection.aggregate([
      {
        $group: {
          _id: "$instructor_email",
          totalPayments: { $sum: 1 }
        }
      },
      {
        $sort: { totalPayments: -1 }
      },
      {
        $limit: 6
      }
    ]).toArray();

    const instructorEmails = result.map(instructor => instructor._id);

    const instructors = await usersCollection.find({ email: { $in: instructorEmails } }).toArray();

    const enrichedResult = result.map(instructor => {
      const matchedInstructor = instructors.find(i => i.email === instructor._id);
      return {
        email: instructor._id,
        name: matchedInstructor?.name,
        totalPayments: instructor.totalPayments,
        image: matchedInstructor?.photo
      };
    });

    res.send(enrichedResult);
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});




// ----------------------------------

app.get('/payments/', verifyJWT, async (req, res) => {
  const email = req.query.email;

  if (!email) {
    res.send([]);
  }

  const decodedEmail = req.decoded.email;
  if (email !== decodedEmail) {
    return res.status(403).send({ error: true, message: 'forbidden access' })
  }
  const query = { user_email: email };
  const result = await paymentCollection.find(query).toArray();
  res.send(result);
});


// app.get('/paymentsPopular', async (req, res) => {
//   let query = {};
//   if (req.query?.email) {
//     query = { email: req.query.email };
//   }

//   const result = await paymentCollection.aggregate([
//     { $match: query },
//     { $group: { _id: '$bookedClassId', count: { $sum: 1 } } },
//     { $sort: { count: -1 } },
//     { $limit: 6 }
//   ]).toArray();

//   res.send(result);
// });


app.get('/paymentsPopular', async (req, res) => {
  let query = {};
  if (req.query?.email) {
    query = { email: req.query.email };
  }

  const result = await paymentCollection.aggregate([
    { $match: query },
    { $group: { _id: '$bookedClassId', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 6 }
  ]).toArray();

  // Extract the bookedClassIds from the result
  const bookedClassIds = result.map(item => item._id);

  // Query the 'bookedClasses' collection for additional information
  const bookedClasses = await bookedClassesCollection.find({ _id: { $in: bookedClassIds } }).toArray();

  // Combine the payment and bookedClass information
  const combinedResult = result.map(item => {
    const bookedClass = bookedClasses.find(classItem => classItem._id === item._id);
    return {
      _id: item._id,
      count: item.count,
      name: bookedClass.name,
      category: bookedClass.category,
      instructor: bookedClass.instructor
    };
  });

  res.send(combinedResult);
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
  res.send('School server is running!')
})


app.listen(port, () => {
  console.log(`app listening on port ${port}`)
})
