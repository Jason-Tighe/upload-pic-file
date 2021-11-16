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

//we're going to need to check for readstream.
//const readStream - gfs.gfs.createReadStream(file.filename);
// readstream.pipe(res)

//@route POST /upload
//@desc Uploads file
//file is the input name
app.post('/upload', upload.single('file'), (req, res)=>{
  res.json({file: req.file})
})



app.listen(PORT, ()=>{
  console.log(`server started on port ${PORT}`)
})
