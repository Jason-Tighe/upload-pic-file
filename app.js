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
const conn = mongoose.createConnection(MONGODB_URI, {useUnifiedTopology: true, useNewUrlParser: true });

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


//will have to deploy a version or something so i can then check if i can create QR codes.

//learning that you can't just add the contenttype for word docs and it'll work. Will have to look into this further.
//Also I'll have to look into writing out differnt ways for contentType so i don't have to add a bunch of "OR" statements
app.get('/', (req, res)=>{
  gfs.files.find().toArray((err, files)=>{
    if(!files || files.length === 0){
      res.render('index', {files: false})
    } else {
      files.map(file =>{
        if(file.contentType === 'image/jpeg' || file.contentType === 'image/png' || file.contentType === 'application/pdf' || file.contentType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'){
          file.isImage = true;
        } else {
          file.isImage = false
        }
      })
    }
   res.render('index', {files: files})
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
//changing the mongoose version fixed this? 5.13.5 works
// display image/pdf/ not file?
app.get('/image/:filename', (req, res) => {
  gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
    // Check if file
    if (!file || file.length === 0) {
      return res.status(404).json({
        err: 'No file exists'
      });
    }

    // Check if image
    if (file.contentType === 'image/jpeg' || file.contentType === 'image/png' || file.contentType === 'application/pdf' || file.contentType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      // Read output to browser
      const readstream = gfs.createReadStream(file.filename);
      readstream.pipe(res);
    } else {
      res.status(404).json({
        err: 'Not an image'
      });
    }
  });
});

//delete image
app.delete('/files/:id', (req, res) => {
  gfs.remove({ _id: req.params.id, root: 'uploads' }, (err, gridStore) => {
    if (err) {
      return res.status(404).json({ err: err });
    }

    res.redirect('/');
  });
});


app.listen(PORT, ()=>{
  console.log(`server started on port ${PORT}`)
})
