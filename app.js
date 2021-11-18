require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const multer = require('multer');
const {GridFsStorage} = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const methodOverride = require('method-override');

const app = express();

//mongo uri being brought in
const MONGODB_URI = process.env.MONGODB_URI
const PORT = process.env.PORT || 5000;

//Middleware
app.use(bodyParser.json());
app.use(methodOverride('_method'));
app.set('view engine', 'ejs');

// Create mongo connection
const conn = mongoose.createConnection(MONGODB_URI);

// Init gfs
let gfs;

conn.once('open', () => {
  // Init stream
  gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection('uploads');
});

// Create storage engine
const storage = new GridFsStorage({
  url: MONGODB_URI,
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(16, (err, buf) => {
        if (err) {
          return reject(err);
        }
        const filename = buf.toString('hex') + path.extname(file.originalname);
        const fileInfo = {
          filename: filename,
          bucketName: 'uploads'
        };
        resolve(fileInfo);
      });
    });
  }
});
const upload = multer({ storage });


app.get('/', (req, res)=>{
  res.render('index')
})



//@route POST /upload
//@desc Uploads file
//file is the input name
app.post('/upload', upload.single('file'), (req, res)=>{
  res.json({file: req.file})
  res.redirect('/')
})

//index(array of files)
app.get('/files', (req, res)=>{
  gfs.files.find().toArray((err, files)=>{
    if(!files || files.length === 0){
      return res.status(404).json({
        err: 'No files exist'
      })
    }
  return res.json(files)
})
})

//show single file
app.get('/files/:filename', (req, res)=>{
  gfs.files.findOne({filename: req.params.filename}, (err, file) =>{
    //check if file exists
    if(!file || file.length === 0){
      return res.status(404).json({
        err: 'No file exist'
      })
    }
    //file exist
    return res.json(file)
  })
})


//get /image/:filename
//issue is that grifFSBucket needs to be added to fix current issue according to stack https://stackoverflow.com/questions/47845334/typeerror-grid-is-not-a-constructor-mongodb-node-driver
// display image
app.get('/image/:filename', (req, res)=>{
  gfs.files.findOne({filename: req.params.filename}, (err, file) =>{
    //check if file exists
    if(!file || file.length === 0){
      return res.status(404).json({
        err: 'No file exist'
      })
    }
  //check if image
  if(file.contentType === 'image/jpg' || file.contentType === 'image/png'){
    //read output to browser
    const readstream = gfs.createReadStream(file.filename);
    readstream.pipe(res)
  } else {
    res.status(404).json({
      err: 'Not an image'
    })
    }
  })
})


app.listen(PORT, ()=>{
  console.log(`server started on port ${PORT}`)
})
