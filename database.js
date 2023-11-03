import * as dotenv from 'dotenv';
dotenv.config();
import { MongoClient, ObjectId } from 'mongodb';
import debug from 'debug';
const debugDb = debug('app:Database');

const newId = (str) => new ObjectId(str);
let _db = null;

async function connect(){
    if(!_db){
        const dbUrl = process.env.DB_URL;
        const dbName = process.env.DB_NAME;
        console.log(dbName);
        const client = await MongoClient.connect(dbUrl);
        _db = client.db(dbName);
        debugDb('Connected');
    }
    return _db;
}

async function ping(){
    const db = await connect();
    const ping = await db.command({ping:1});
    debugDb(ping);
}

//Products
async function getProducts(){
    const db = await connect();
    const products = await db.collection('Product').find().toArray();
    debugDb('Got Products.');
    return products;
}
async function getProductById(id){
    const db = await connect();
    const product = await db.collection('Product').findOne({ _id: newId(id) });
    debugDb('Got product by ID');
    return product;
}
async function getProductByName(name){
    const db = await connect();
    const product = await db.collection('Product').findOne({ name: name });
    debugDb('Got product by name');
    return product;
}
async function addNewProduct(product){
    const db = await connect();
    const existingProduct = await db.collection('Product').findOne({ name: product.name});
    if(existingProduct != null){
        return {productExists: true};
    }
    product._id = newId();
    product.createdOn = new Date();
    product.lastUpdatedOn = new Date();
    const result = await db.collection('Product').insertOne(product);
    const addedProduct = await db.collection('Product').findOne({_id:product._id});
    return {result: result, addedProduct: addedProduct};
}
async function updateProduct(id,updatedProduct){
    const db = await connect();
    const result = await db.collection('Product').updateOne({_id: newId(id)},{$set:{...updatedProduct}});
    debugDb('Product updated');
    return result;
}
async function deleteProduct(id){
    const db = await connect();
    const deletedIdFound = await db.collection('Product').findOne({_id: newId(id)});
    if(deletedIdFound == null){
        return {productExists: false,result:`Product ID not found`};
    }else{
        const deleteResult = await db.collection('Product').deleteOne({_id: newId(id)});
        debugDb('Product Deleted');
        return {productExists: true, result: `Product ${deleteResult.name} deleted`};
    }
}

//Users
async function getUsers() {
    const db = await connect();
    const users = await db.collection('User').find().toArray();
    debugDb('Got users.');
    return users;
}
async function getUserById(id){
    const db = await connect();
    const user = await db.collection('User').findOne({
        _id: newId(id),
    });
    debugDb('Got user by id');
    return user;
}
async function addNewUser(user){
    const db = await connect();
    const existingUser = await db.collection('User').findOne({
        email:user.email,
    });
    if(existingUser != null){
        return{
            userExists: true,
            userAdded: false,
        };
    }
    const result = await db.collection('User').insertOne(user);
    const addedUser = await db.collection('User').findOne({
        _id:user._id,
    });
    return{
        result: result,
        userAdded: true,
        addedUser: addedUser,
    };
}
async function loginUser(user){
    const db = await connect();
    const existingUser = await db.collection('User').findOne({email:user.email});
    if(!existingUser){
        return {
            userExists: false,
        };
    }else{
        return{
            userExists: true,
            user: existingUser,
        };
    }
}
async function updateUser(userId,updatedUser){
    const db = await connect();
    const result = await db.collection('User').updateOne(
        { _id: newId(userId),
        },    
        { $set: {...updatedUser,},
        }
    );
    debugDb('User updated');
    return result;
}
export {
    getProducts,
    getProductById,
    getProductByName,
    addNewProduct,
    updateProduct,
    deleteProduct,

    getUsers,
    getUserById,
    addNewUser,
    loginUser,
    updateUser,
}

ping();