import express from 'express';
const router = express.Router();
import debug from 'debug';
const debugUser = debug('app.ProductRouter');
import { getUsers,getUserById,addNewUser,loginUser,updateUser} from '../../database.js';
import { ObjectId } from 'mongodb';
import {validBody} from '../../middleware/validBody.js';
import {validParams} from '../../middleware/validId.js';
import Joi from 'joi';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

//Schema Here
const newUserSchema = Joi.object({
    fullName: Joi.string().trim().min(1).max(50).required(),
    password: Joi.string().trim().min(8).max(50).required(),
    email: Joi.string().trim().email().required(),
    role: Joi.string().trim().min(1).max(50).required(),
});
const loginUserSchema = Joi.object({
    password: Joi.string().trim().min(8).max(50).required(),
    email: Joi.string().trim().email().required(),
});

router.use(express.urlencoded({ extended: false }));
const newId = (str) => new ObjectId(str);;

async function issueAuthToken(user){
    const payload = {_id:user._id,email:user.email,password:user.password,fullName:user.fullName,role:user.role};
    const secret = process.env.JWT_SECRET;
    const options = {expiresIn: '1h'};

    const authToken = jwt.sign(payload,secret,options);
    return authToken;
}
function issueAuthCookie(res,authToken){
    const cookieOptions = {httpOnly: true,maxAge:1000*60*60};
    res.cookie('authToken',authToken,cookieOptions)
}

//Routes Here
router.get('/list',async (req,res) =>{
    if(!req.auth){
        res.status(401).json({error:'Not authorized'});
        return;
      }
      
      let { keywords, role, minAge, maxAge, sortBy, pageSize, pageNumber } = req.query;
      const match = {};
      let sort = { fullName: 1 };

      
try {
    const users = await getUsers();
    res.status(200).json(users);
    console.log(users);
  } catch (err) {
    res.status(404).json({error:err.stack})
    console.log(err);
  }
});
router.get('/me', async (req,res) =>{
  if(!req.auth){
      res.status(401).json({error:'Not authorized'});
      return;
    }
    const userId = req.auth._id;
    debugUser(userId);
    try{
      const user = await getUserById(userId);
      if (!user) {
        res.status(400).json(`User not found.`);
      } else {
        res.status(200).json(user);
      }
    }catch(err){
      res.status(400).json({error: 'Invalid user data',err_Message:err.stack});
    }
});
router.get('/:id', validParams('id'), async (req,res) => {
  const userId = req.params.id;
  try {
    const user = await getUserById(userId);
    if (!user) {
      res.status(404).json(`User not found.`);
    } else {
      res.status(200).json(user);
    }
  } catch (err) {
    res.status(500).json({ error: err.stack });
  }
});
router.post('/register', validBody(newUserSchema), async (req,res) =>{
    try{
        const user = 
        {
          _id: newId(),
          ...req.body,
          creationDate: new Date(),
        }
        user.password = await bcrypt.hash(user.password,10);
         const results = await addNewUser(user);
         if(results.userExists){
            res.status(400).json({error:'There is already currently a user with this email'});
         }else{
            const authToken = await issueAuthToken(user);
            issueAuthCookie(res,authToken);
            res.status(200).json({result:results.result,addedUser:results.addedUser});
         }
    }catch(err){
        res.status(500).json({error:err.stack});
    }
});
router.post('/login',validBody(loginUserSchema), async (req,res) =>{
    const user = req.body;
    try{
        const results = await loginUser(user);
        if(results.userExists && (await bcrypt.compare(user.password,results.user.password))){
            const authToken = await issueAuthToken(results.user);
            issueAuthCookie(res,authToken);
            res.status(200).json(`Welcome back ${results.user.fullName}.`);
        }else{
            res.status(400).json({error:`Invalid login credentials`});
        }
    }catch(err){
        res.status(500).json({error:err.stack});
    }
});
router.put('/me',async (req,res) =>{
  try{
    if(!req.auth){
      res.status(401).json({error:'Not authorized'});
      return;
    }
    const userId = req.auth._id;
    const temporaryUser = req.body;
    const updatedUser = {
      fullName: temporaryUser.fullName || req.auth.fullName,
      email: temporaryUser.email || req.auth.email,
      lastUpdated: new Date(),
      lastUpdatedBy: req.auth.fullName,
    }
    if(temporaryUser.password){
      updatedUser.password = bcrypt.hash(temporaryUser.password, 10);
      debugUser(temporaryUser.password);
    }
      const result = await updateUser(userId,updatedUser);
      debugUser(`${userId}`);
      debugUser(JSON.stringify(updatedUser));
      if (result.modifiedCount == 1) {
        res.status(200).json({ message: `User ${userId} updated!`,user: req.auth});
      } 
      else {
        res.status(404).json({ error: `User ${userId} not found.` });
      }
    }catch(err){
      res.status(500).json({error:err.stack});
    }
});
export { router as UserRouter };
