const express = require('express');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const Message = require('./models/Message')
const cors = require('cors');
const bcrypt = require('bcryptjs');
const ws = require('ws');
const fs = require('fs');


dotenv.config();
mongoose.connect(process.env.MONGO_URL)
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((error) => {
    console.error('Error connecting to MongoDB:', error);
  });

const jwtSecret = process.env.JWT_SECRET;
const bcryptSalt = bcrypt.genSaltSync(10);
const app = express();
app.use('/uploads/', express.static(__dirname + '/uploads'))
app.use(express.json());
app.use(cookieParser());

// CORS 
app.use(cors({
    origin : "http://localhost:5000",
    credentials: true,
}))

// Configure CORS to allow requests from http://localhost:5000
// app.use(
//   cors({
//     credentials: true,
//     origin: process.env.CLIENT_URL, // Replace with your frontend URL
//     methods: ['POST', 'PUT', 'PATCH', 'GET', 'DELETE', 'OPTIONS'],
//     allowedHeaders: [
//       'Origin',
//       'X-Api-Key',
//       'X-Requested-With',
//       'Content-Type',
//       'Accept',
//       'Authorization',
//     ],
//   })
// );
// OPTIONS TO HTTPS
// app.options('/register', (req, res) => {
//     // Add CORS headers to the response for OPTIONS requests
//     res.header('Access-Control-Allow-Origin', 'http://localhost:5000');
//     res.header('Access-Control-Allow-Methods', 'POST, PUT, PATCH, GET, DELETE, OPTIONS');
//     res.header('Access-Control-Allow-Headers', 'Origin, X-Api-Key, X-Requested-With, Content-Type, Accept, Authorization');
//     res.header('Access-Control-Allow-Credentials', 'true');
//     res.status(204).end();
//   });

//   app.use((_req, res, next) => {
//     res.header('Access-Control-Allow-Origin', '*');
//     res.header('Access-Control-Allow-Headers', '*');
  
//     next();
//   });

async function getUserDataFromRequest(req){
    return new Promise ((resolve, reject)=>{
        const token = req.cookies?.token;
    if (token) {
      jwt.verify(token, jwtSecret, {}, (err, userData) => {
        if (err) throw err;
        resolve(userData);
      });
    } else {
        reject("No Token")
    }
    });  
}

app.get('/test', (req, res) => {
  res.json('test ok');
});

app.get('/messages/:userId', async (req,res) => {
    const {userId} = req.params;
   const userData = await getUserDataFromRequest(req);
   const ourUserId = userData.userId;
  const messages = await Message.find({
    sender:{$in:[userId,ourUserId]},
    recipient:{$in:[userId,ourUserId]},
   }).sort({createdAt: 1});
   res.json(messages);
});

app.get('/people', async (req,res) => {
    const users = await User.find({}, {'_id':1,username:1});
    res.json(users);
  });

app.get('/profile', (req,res) => {
    const token = req.cookies?.token;
    if (token) {
      jwt.verify(token, jwtSecret, {}, (err, userData) => {
        if (err) throw err;
        res.json(userData);
      });
    } else {
      res.status(401).json('no token');
    }
  });

app.post('/login', async (req,res) => {
    const {username, password} = req.body;
    const foundUser = await User.findOne({username});
    if (foundUser){
      const passOk = bcrypt.compareSync(password, foundUser.password)
      if (passOk){
        jwt.sign({userId:foundUser._id, username}, jwtSecret, {}, (err, token) => {
            res.cookie('token', token, {sameSite:'none', secure:true}).json({
                id: foundUser._id,
            });
        });
      }
    }
});

app.post('/logout', (req,res) => {
    res.cookie('token', '', {sameSite:'none', secure:true}).json('ok');
  });

app.post('/register', async (req, res) => {
  // Your registration logic here
  const {username,password} = req.body;
  try{
    const hashedPassword = bcrypt.hashSync(password, bcryptSalt)
    const createUser = await User.create({
        username: username,
        password: hashedPassword,
    });
    jwt.sign({userId:createUser._id,username}, jwtSecret,{}, (err, token) => {
        if (err) throw err;
        res.cookie('token', token, {sameSite:'none', secure:true}).status(201).json({
            id: createUser._id, 
        });
      });
  } catch(err){
    if (err)throw err;
    res.status(500).json('error');
  }
});

 const server = app.listen(4040);
 const wss = new ws.WebSocketServer({server});
 wss.on('connection', (connection,req)=> {
    function notifyAboutOnlinePeople(){
        [...wss.clients].forEach(client => {
            client.send(JSON.stringify({
                online: [...wss.clients].map(c => ({userId:c.userId, username:c.username})),
            }));
        });
    }
    connection.isAlive = true;
    connection.timer = setInterval(() => {
        connection.ping();
        connection.deathTimer = setTimeout(() =>{
            connection.isAlive = false;
            clearInterval(connection.timer);
            connection.terminate();
            notifyAboutOnlinePeople();
            console.log('dead')
        },1000);
    }, 5000);
    connection.on('pong', () => {
       clearTimeout( connection.deathTimer );
    });
    // read username and id from the cookie for this connection
    const cookies = req.headers.cookie;
    if (cookies){
      const tokenCookiesString = cookies.split(';').find(str => str.startsWith('token='));
      if (tokenCookiesString){
        const token = tokenCookiesString.split('=')[1];
        if(token){
         jwt.verify(token, jwtSecret, {}, (err, userData) => {
            if (err) throw err;
            const { userId, username, } = userData;
            connection.userId = userId;
            connection.username = username;
         });
        }
      }
    }


    // Try to send the message test
    connection.on('message', async (message) => {
        const messageData = JSON.parse(message.toString());
        const {recipient, text, file} = messageData;
        let filename = null;
        if (file) {
          console.log('size', file.data.length);
          const parts = file.name.split('.');
          const ext = parts[parts.length - 1];
          filename = Date.now() + '.'+ext;
          const path = __dirname + '/uploads/' + filename;
          const bufferData = new Buffer.from(file.data.split(',')[1], 'base64');
          fs.writeFile(path, bufferData, () => {
            console.log('file saved:'+path);
          });
        }
        if (recipient && (text || file)) {
          const messageDoc = await Message.create({
            sender:connection.userId,
            recipient,
            text,
            file: file ? filename : null,
          });
          console.log('created message');
          [...wss.clients]
            .filter(c => c.userId === recipient)
            .forEach(c => c.send(JSON.stringify({
              text,
              sender:connection.userId,
              recipient,
              file: file ? filename : null,
              _id:messageDoc._id,
            })));
        }
      });


    // notify everyone about online people (when someone connected)
    notifyAboutOnlinePeople();
 });
