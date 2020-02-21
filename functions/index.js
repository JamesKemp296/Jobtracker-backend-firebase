const functions = require('firebase-functions')
const app = require('express')()
const FBAuth = require('./util/fbauth')

const cors = require('cors')
app.use(cors())

const { getAllJobs, postOneJob } = require('./handlers/jobs')
const {
  getAllUsers,
  signup,
  login,
  addUserDetails,
  uploadImage,
  getUserDetails,
  getAuthenticatedUser
} = require('./handlers/users')

// User routes
app.get('/users', getAllUsers)
app.post('/signup', signup)
app.post('/login', login)
app.post('/user', FBAuth, addUserDetails)
app.post('/user/image', FBAuth, uploadImage)
app.get('/user/:userId', getUserDetails)
app.get('/user', FBAuth, getUserDetails)

// Job Routes
app.get('/jobs', getAllJobs)
app.post('/job', FBAuth, postOneJob)

exports.api = functions.https.onRequest(app)
