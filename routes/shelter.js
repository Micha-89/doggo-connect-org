const router = require("express").Router();
const User = require('../models/User');
const Dog = require('../models/Dog')
const bcrypt=require('bcrypt');
const passport = require('passport');
const loginCheck = require('../middleware/loginCheck.js')
const checkRoles = require('../middleware/permissions.js')
const fileUploader = require('../config/cloudinary.config');
const cloudinary = require('cloudinary').v2;
const axios = require('axios');
const shelter='SHELTER'
const adopter='ADOPTER'

 
router.get('/dogs', checkRoles(shelter), (req, res) => {
 res.render('shelterViews/form')

})

router.post('/dogs',checkRoles(shelter), fileUploader.single('image'), (req, res)=>{
let {name, age, gender, size, breed, description} = req.body;

if(!name || !age || !gender || !size || !breed || req.file == undefined ||  !description){
  res.render('shelterViews/form', {message: 'Please provide all information!'})
}else{

  const imgPath = req.file.path
  const publicId = req.file.filename 

  Dog.create(
      {name: name,
      age:age, 
      gender:gender, 
      size: size, 
      breed:breed, 
      imageUrl: imgPath, 
      publicId: publicId,
      description:description, 
      shelter: req.user._id})
  .then(dog=>{
    res.redirect('/dogs/all')
    }).catch(err=>console.log(`Error in Process of Dog creation ${err}`))
  }
})

router.get('/dogs/all', checkRoles(shelter), (req, res)=>{
 const user = req.user._id;
 Dog.find({shelter: user})
 .then(dog=>{
   res.render('shelterViews/allDoggos', {dog: dog})
  }).catch(err=>console.log(err))
})



router.get('/dogs/:id', checkRoles(shelter), (req, res)=>{
  const dogId=req.params.id;
  Dog.findById(dogId).populate('shelter').then(dog=>{
    res.render('shelterViews/showDog', {dog: dog})
  }).catch(err=>console.log(err))
})

router.get('/dogs/:id/edit', checkRoles(shelter), (req, res)=>{
  Dog.findById(req.params.id).then(dog=>{
    let optionsGender = '';
    ['female', 'male'].forEach(gender=>{
      let selectedGender='';
      selectedGender = (dog.gender === gender) ? ' selected' : '' 
      optionsGender += `<option value="${gender}" ${selectedGender}> ${gender}  </option>`
    })
  let optionsSize = '';
  ['small', 'middle', 'large'].forEach(size=>{
    let selectedSize = '';
    selectedSize=(dog.size === size) ? ' selected' : '';
    optionsSize += `<option value="${size}"  ${selectedSize}> ${size} </option>`
  })
    res.render('shelterViews/dogEdit', {dog, optionsGender, optionsSize})
  }).catch(err=>console.log(err))
  
})

router.post('/dogs/:id/edit', checkRoles(shelter), fileUploader.single('image'), (req, res)=>{
  const id=req.params.id;
  const {name, age, gender, size, breed, description } = req.body;
  
  
  console.log('Round1', req.file)
  if(req.file){
         
    const publicId = req.file.filename 
    const imageUrl = req.file.path;
    Dog.findByIdAndUpdate(id, {name, age, gender, size, breed, description, imageUrl, publicId }, {new: true})
  .then(dog=> res.redirect(`/dogs/${dog._id}`))
  .catch(err=>console.log(err))
  }else{
    
    Dog.findByIdAndUpdate(id, {name, age, gender, size, breed, description }, {new: true})
  .then(dog=> res.redirect(`/dogs/${dog._id}`))
  .catch(err=>console.log(err))
  }
  
})

router.get('/dogs/:id/delete', (req, res)=>{
  Dog.findByIdAndDelete(req.params.id)
  .then(dog=>{
    if(dog.imgPath){
       cloudinary.uploader.destroy(dog.publicId)
    }else{
      res.redirect('/dogs/all')
    }
  }).catch(err=>console.log(err))
})

router.get('/applications', checkRoles(shelter), (req, res)=>{
  const user = req.user._id;
  Dog.find({shelter: user})
  .then(dogs=>{  
    const dogsFiltered = dogs.filter(dog=>{
     return dog.messages[0] !== undefined     
    })
   res.render('shelterViews/applications', {dog: dogsFiltered})
   }).catch(err=>console.log(err))
 })
 
 router.get('/applications/:id', checkRoles(shelter), (req, res)=>{
   const dogId=req.params.id;
   Dog.findById(dogId).populate('messages.applicant')
   .then(dog=>{
     res.render('shelterViews/applicationDog', {dog} )
   })
 })
 

//PROFILE PAGE:  EDIT

router.get('/private/profile', checkRoles(shelter), (req, res)=>{
  const userId = req.user._id;
  User.findById(userId).then(user => {
    res.render('shelterViews/profileSubmit', {user})
  }).catch(err => {
    console.log(err);
  })

})

router.post('/private/profile', checkRoles(shelter), (req,res)=>{
  const {name, street, city, postcode } = req.body;
  
  if(!name|| !street || !city ||!postcode){
    const userId = req.user._id;
    User.findById(userId).then(user => {
      res.render('shelterViews/profileSubmit', {user, message: 'Please fill in all the fields'})
    }).catch(err => {
      console.log(err);
    })
    return 
  }
    //axios get req using API for coordinates
  // axios.get(`https://api.mapbox.com/geocoding/v5/mapbox.places/${city}.json?access_token=pk.eyJ1IjoiYW5hbWFyaWFnIiwiYSI6ImNrbDI2cnNwczFhYzQycnFvanRhOHpvNnoifQ.3qmM7cisXOM7SVZBH3hHSQ`)
  // .then(res=>console.log(res.data.features.geometry))
  axios.get(`https://api.mapbox.com/geocoding/v5/mapbox.places/${city}.json?access_token=pk.eyJ1IjoiYW5hbWFyaWFnIiwiYSI6ImNrbDI2cnNwczFhYzQycnFvanRhOHpvNnoifQ.3qmM7cisXOM7SVZBH3hHSQ`)
  .then(res=>{
    const coordinates = res.data.features[0].geometry.coordinates
    User.findByIdAndUpdate(req.user._id, {name, street, city, postcode, coordinates})
     .then(user=>{
       console.log('test')
      }).catch(err=>console.log(err))
  }).catch(err=>console.log(err))

  res.redirect('/private')

})

router.get('/private/profile/:id', checkRoles(shelter), (req, res)=>{
  const id=req.params.id;
  User.findById(id).then(user=>{
    res.render('shelterViews/profile', {user: user})
  })
})
 
router.get('/private/profile/:id/edit', checkRoles(shelter), (req, res)=>{
  const id=req.params.id;
  User.findById(id).then(user=>{
    res.render('shelterViews/profileEdit', {user: user})
  })
})
 

router.post('/private/profile/:id', checkRoles(shelter), (req,res)=>{
  const {name, street, city, postcode } = req.body;
  const id = req.params.id
  if(!name|| !street || !city ||!postcode){
    const userId = req.user._id;
    User.findById(userId).then(user => {
      res.render('shelterViews/profileEdit', {user, message: 'Please fill in all the fields'})
    }).catch(err => {
      console.log(err);
    })
    return 
  }
    //axios get req using API for coordinates
  // axios.get(`https://api.mapbox.com/geocoding/v5/mapbox.places/${city}.json?access_token=pk.eyJ1IjoiYW5hbWFyaWFnIiwiYSI6ImNrbDI2cnNwczFhYzQycnFvanRhOHpvNnoifQ.3qmM7cisXOM7SVZBH3hHSQ`)
  // .then(res=>console.log(res.data.features.geometry))
  axios.get(`https://api.mapbox.com/geocoding/v5/mapbox.places/${city}.json?access_token=pk.eyJ1IjoiYW5hbWFyaWFnIiwiYSI6ImNrbDI2cnNwczFhYzQycnFvanRhOHpvNnoifQ.3qmM7cisXOM7SVZBH3hHSQ`)
  .then(res=>{
    const coordinates = res.data.features[0].geometry.coordinates
    User.findByIdAndUpdate(req.user._id, {name, street, city, postcode, coordinates})
     .then(user=>{
       console.log('test')
      }).catch(err=>console.log(err))
  }).catch(err=>console.log(err))

  res.redirect('/private')

})
 module.exports=router