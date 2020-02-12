const functions = require('firebase-functions')
const admin = require('firebase-admin')
var serviceAccount = require('../admin.json')
const app = require('express')()

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://wyn-jobtracker.firebaseio.com'
})

const config = {
  apiKey: 'AIzaSyC68hCwa7dLpNp0dLTWCBhxjkLC8_sV1_0',
  authDomain: 'wyn-jobtracker.firebaseapp.com',
  databaseURL: 'https://wyn-jobtracker.firebaseio.com',
  projectId: 'wyn-jobtracker',
  storageBucket: 'wyn-jobtracker.appspot.com',
  messagingSenderId: '659738962571',
  appId: '1:659738962571:web:d06218fe5b54c7d705028e',
  measurementId: 'G-NM17801JLP'
}

const firebase = require('firebase')
firebase.initializeApp(config)

const db = admin.firestore()

app.get('/users', (req, res) => {
  db.collection('users')
    .get()
    .then(data => {
      let users = []
      data.forEach(doc => {
        users.push(doc.data())
      })
      return res.json(users)
    })
    .catch(err => console.error(err))
})

app.get('/jobs', (req, res) => {
  db.collection('jobs')
    .orderBy('createdAt', 'desc')
    .get()
    .then(data => {
      let jobs = []
      data.forEach(doc => {
        jobs.push({
          jobId: doc.id,
          company: doc.data().company,
          position: doc.data().position,
          status: doc.data().status,
          link: doc.data().link,
          createdAt: doc.data().createdAt
        })
      })
      return res.json(jobs)
    })
    .catch(err => console.error(err))
})

app.post('/job', (req, res) => {
  const newJob = {
    company: req.body.company,
    position: req.body.position,
    status: req.body.status,
    link: req.body.link,
    createdAt: new Date().toISOString()
  }
  db.collection('jobs')
    .add(newJob)
    .then(doc => {
      res.json({ message: `document ${doc.id} created successfully` })
    })
    .catch(err => {
      res.status(500).json({ error: 'Something went wrong' })
      console.error(err)
    })
})

const isEmail = email => {
  const emailRegEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
  if (email.match(emailRegEx)) return true
  else return false
}

const isEmpty = string => {
  if (string.trim() === '') return true
  else return false
}

// Signup route
app.post('/signup', (req, res) => {
  const newUser = {
    email: req.body.email,
    password: req.body.password,
    confirmPassword: req.body.confirmPassword
  }

  let errors = {}

  if (isEmpty(newUser.email)) {
    errors.email = 'Must not be empty'
  } else if (!isEmail(newUser.email)) {
    errors.email = 'Must be a valid email address'
  }

  if (isEmpty(newUser.password)) errors.password = 'Must not be empty'
  if (newUser.password !== newUser.confirmPassword)
    errors.confirmPassword = 'Passwords must match'

  if (Object.keys(errors).length > 0) return res.status(400).json(errors)
  let token, userId
  db.doc(`/users/${newUser.email}`)
    .get()
    .then(doc => {
      if (doc.exists) {
        return res.status(400).json({ email: 'Email already in use' })
      } else {
        return firebase
          .auth()
          .createUserWithEmailAndPassword(newUser.email, newUser.password)
      }
    })
    .then(data => {
      userId = data.user.uid
      return data.user.getIdToken()
    })
    .then(idToken => {
      token = idToken
      const userCredentials = {
        email: newUser.email,
        createdAt: new Date().toISOString(),
        userId
      }
      return db.doc(`/users/${newUser.email}`).set(userCredentials)
    })
    .then(() => {
      return res.status(201).json({ token })
    })
    .catch(err => {
      console.error(err)
      if (err.code === 'auth/email-already-in-use') {
        return res.status(400).json({ email: 'Email is already in use' })
      } else {
        return res.status(500).json({ error: error.code })
      }
    })
})

app.post('/login', (req, res) => {
  const user = {
    email: req.body.email,
    password: req.body.password
  }

  let errors = {}
  if (isEmpty(user.email)) errors.email = 'Must not be empty'
  if (isEmpty(user.password)) errors.password = 'Must not be empty'

  if (Object.keys(errors).length > 0) return res.status(400).json(errors)

  firebase
    .auth()
    .signInWithEmailAndPassword(user.email, user.password)
    .then(data => {
      return data.user.getIdToken()
    })
    .then(token => {
      return res.json({ token })
    })
    .catch(err => {
      console.error(err)
      if (err.code === 'auth/wrong-password') {
        return res
          .status(403)
          .json({ general: 'Wrong credentials, please try again' })
      } else return res.status(500).json({ error: error.code })
    })
})

exports.api = functions.https.onRequest(app)
